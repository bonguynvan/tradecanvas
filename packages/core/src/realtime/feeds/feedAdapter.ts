import type {
  BarsSubscription,
  ConnectionState,
  DataAdapter,
  DataAdapterConfig,
  DataAdapterEventType,
  DataAdapterListener,
  DataFeed,
  FeedSubscriber,
  OHLCBar,
  RawTick,
  StreamConfig,
  SymbolInfo,
  TimeFrame,
} from '@tradecanvas/commons';

/** The adapter a feed made by `feedFromAdapter` stands for: wrapping it back gives the adapter itself. */
const SOURCE_ADAPTER = Symbol('tradecanvas.sourceAdapter');

type FeedOfAdapter = DataFeed & { [SOURCE_ADAPTER]?: DataAdapter };

/** The adapters made from feeds: the stream leaves their silence alone (`isFeedAdapter`). */
const feedAdapters = new WeakSet<DataAdapter>();

/**
 * Whether `adapter` was made from a feed (`adapterFromFeed`). A feed says
 * itself when its connection drops, so the stream doesn't take a quiet one
 * (a daily chart, a closed market) for a dead socket.
 */
export function isFeedAdapter(adapter: DataAdapter): boolean {
  return feedAdapters.has(adapter);
}

const seriesKey = (symbol: string, timeframe: TimeFrame): string => `${symbol}\u0000${timeframe}`;

/** Whether `source` is a `DataFeed` (it pulls with `getBars`) rather than a `DataAdapter`. */
export function isDataFeed(source: DataFeed | DataAdapter): source is DataFeed {
  return typeof (source as DataFeed).getBars === 'function' && typeof (source as DataFeed).subscribeBars === 'function';
}

/**
 * The adapter a stream runs on: its `adapter`, or one made from its `feed`.
 * Throws when it has neither, or both.
 */
export function streamAdapterOf(config: Pick<StreamConfig, 'adapter' | 'feed'>): DataAdapter {
  if (config.adapter && config.feed) throw new TypeError('A stream takes an adapter or a feed, not both');
  if (config.adapter) return config.adapter;
  if (config.feed) return adapterFromFeed(config.feed);
  throw new TypeError('A stream needs an adapter or a feed');
}

/** Copies the optional methods `from` has onto `to`, bound to `from`. */
function passOptional<K extends keyof DataFeed & keyof DataAdapter>(to: Record<string, unknown>, from: DataFeed | DataAdapter, keys: readonly K[]): void {
  for (const key of keys) {
    const method = from[key];
    if (typeof method === 'function') to[key] = (method as (...args: unknown[]) => unknown).bind(from);
  }
}

const OPTIONAL_METHODS = ['resolveSymbol', 'searchSymbols', 'subscribeQuotes', 'fetchNews', 'fetchTrades', 'subscribeTrades'] as const;

/**
 * A `DataAdapter` on top of `feed`, for everything that takes an adapter.
 * Each call makes a new one: an adapter keeps one stream, a feed serves any
 * number, so each chart gets its own. When it disconnects, the requests for
 * the series it streamed are aborted (others, a compare's, run on); what an
 * old subscription sends after a connect replaced it is dropped.
 */
export function adapterFromFeed(feed: DataFeed): DataAdapter {
  const source = (feed as FeedOfAdapter)[SOURCE_ADAPTER];
  if (source) return source;
  const adapter = new FeedAdapter(feed);
  feedAdapters.add(adapter);
  return adapter;
}

class FeedAdapter implements DataAdapter {
  readonly name: string;
  readonly supportedTimeframes?: readonly TimeFrame[];
  /** Older bars before `before`; left out for a feed with only the newest (`pagesBack: false`). */
  readonly fetchHistoryBefore?: (symbol: string, timeframe: TimeFrame, before: number, limit: number) => Promise<OHLCBar[]>;
  private state: ConnectionState = 'disconnected';
  private listeners = new Map<DataAdapterEventType, Set<DataAdapterListener>>();
  private unsubscribe: (() => void) | null = null;
  /** One controller per series asked for: a disconnect aborts the streamed series' only. */
  private requests = new Map<string, AbortController>();
  /** The series the last connect subscribed to. */
  private streamed: string | null = null;

  constructor(private readonly feed: DataFeed) {
    this.name = feed.name;
    if (feed.supportedTimeframes) this.supportedTimeframes = feed.supportedTimeframes;
    if (feed.pagesBack !== false) {
      this.fetchHistoryBefore = (symbol, timeframe, before, limit) =>
        this.feed.getBars({ symbol, timeframe, countBack: limit, before, signal: this.signalFor(symbol, timeframe) });
    }
    passOptional(this as unknown as Record<string, unknown>, feed, OPTIONAL_METHODS);
  }

  fetchHistory(symbol: string, timeframe: TimeFrame, limit = 500): Promise<OHLCBar[]> {
    return this.feed.getBars({ symbol, timeframe, countBack: limit, signal: this.signalFor(symbol, timeframe) });
  }

  connect(config: DataAdapterConfig): void {
    this.stopSubscription();
    const request: BarsSubscription = { symbol: config.symbol, timeframe: config.timeframe };
    this.streamed = seriesKey(config.symbol, config.timeframe);
    let live = true;
    let reported = false;
    let stop: (() => void) | null = null;
    // Set before subscribing: a connect from inside subscribeBars (a retry) stops this one.
    this.unsubscribe = () => {
      live = false;
      stop?.();
    };
    // Every call checks `live`: a socket of the last subscription may still send.
    const subscriber: FeedSubscriber = {
      bar: (bar, closed) => { if (live) this.emit('bar', { bar, closed }); },
      tick: (tick: RawTick) => { if (live) this.emit('tick', tick); },
      connection: (state) => {
        if (!live) return;
        reported = true;
        this.setState(state);
      },
      symbolInfo: (info: SymbolInfo) => { if (live) this.emit('symbolInfo', info); },
      error: (message) => { if (live) this.emit('error', { message }); },
    };
    const unsubscribe = this.feed.subscribeBars(request, subscriber);
    if (!live) {
      unsubscribe(); // replaced while subscribing
      return;
    }
    stop = unsubscribe;
    if (!reported) this.setState('connected');
  }

  disconnect(): void {
    this.stopSubscription();
    if (this.streamed !== null) {
      this.requests.get(this.streamed)?.abort();
      this.requests.delete(this.streamed);
      this.streamed = null;
    }
    this.state = 'disconnected';
  }

  getConnectionState(): ConnectionState {
    return this.state;
  }

  on<T = unknown>(event: DataAdapterEventType, listener: DataAdapterListener<T>): void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener as DataAdapterListener);
  }

  off<T = unknown>(event: DataAdapterEventType, listener: DataAdapterListener<T>): void {
    this.listeners.get(event)?.delete(listener as DataAdapterListener);
  }

  dispose(): void {
    this.disconnect();
    this.listeners.clear();
  }

  private signalFor(symbol: string, timeframe: TimeFrame): AbortSignal {
    const key = seriesKey(symbol, timeframe);
    let controller = this.requests.get(key);
    if (!controller) {
      controller = new AbortController();
      this.requests.set(key, controller);
    }
    return controller.signal;
  }

  private stopSubscription(): void {
    const stop = this.unsubscribe;
    this.unsubscribe = null;
    stop?.();
  }

  private setState(state: ConnectionState): void {
    this.state = state;
    this.emit('connectionChange', state);
  }

  private emit(type: DataAdapterEventType, data: unknown): void {
    const event = { type, data, timestamp: Date.now() };
    for (const listener of [...(this.listeners.get(type) ?? [])]) listener(event);
  }
}

/**
 * A `DataFeed` on top of `adapter`: `getBars` loads through `fetchHistory`
 * and pages through `fetchHistoryBefore` (none: no older bars, `pagesBack` false), and
 * `subscribeBars` connects it. An adapter keeps one stream, so the feed
 * serves one subscription at a time.
 */
export function feedFromAdapter(adapter: DataAdapter): DataFeed {
  const feed: FeedOfAdapter = {
    name: adapter.name,
    ...(adapter.supportedTimeframes ? { supportedTimeframes: adapter.supportedTimeframes } : {}),
    pagesBack: typeof adapter.fetchHistoryBefore === 'function',
    getBars: async ({ symbol, timeframe, countBack, before }) => {
      if (before === undefined) return adapter.fetchHistory(symbol, timeframe, countBack);
      return adapter.fetchHistoryBefore ? adapter.fetchHistoryBefore(symbol, timeframe, before, countBack) : [];
    },
    subscribeBars: (request, subscriber) => subscribeAdapter(adapter, request, subscriber),
    [SOURCE_ADAPTER]: adapter,
  };
  passOptional(feed as unknown as Record<string, unknown>, adapter, OPTIONAL_METHODS);
  return feed;
}

function subscribeAdapter(adapter: DataAdapter, request: BarsSubscription, subscriber: FeedSubscriber): () => void {
  const handlers: [DataAdapterEventType, DataAdapterListener][] = [
    ['bar', (e) => {
      const { bar, closed } = e.data as { bar: OHLCBar; closed: boolean };
      subscriber.bar(bar, closed);
    }],
    ['tick', (e) => subscriber.tick(e.data as RawTick)],
    ['connectionChange', (e) => subscriber.connection(e.data as ConnectionState)],
    ['symbolInfo', (e) => subscriber.symbolInfo(e.data as SymbolInfo)],
    ['error', (e) => subscriber.error((e.data as { message?: string } | undefined)?.message ?? 'Adapter error')],
  ];
  for (const [type, handler] of handlers) adapter.on(type, handler);
  adapter.connect({ symbol: request.symbol, timeframe: request.timeframe });
  return () => {
    for (const [type, handler] of handlers) adapter.off(type, handler);
    adapter.disconnect();
  };
}
