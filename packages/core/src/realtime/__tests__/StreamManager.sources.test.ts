import { describe, it, expect, vi, afterEach } from 'vitest';
import type {
  BarsSubscription,
  ConnectionState,
  DataAdapter,
  DataAdapterEventType,
  DataAdapterListener,
  DataFeed,
  FeedSubscriber,
  OHLCBar,
  RawTick,
  StreamConfig,
  SymbolInfo,
  TimeFrame,
  Trade,
} from '@tradecanvas/commons';
import { StreamManager } from '../StreamManager.js';
import { adapterFromFeed } from '../feeds/feedAdapter.js';
import { ManualFeed } from '../feeds/ManualFeed.js';

/**
 * The stream on each kind of source: an adapter, a feed, and a feed the way
 * a chart hands it over (its own adapter of the feed). Every scenario runs
 * on the three, so the stream behaves the same whichever it is given.
 */

const MINUTE = 60_000;
/** A midnight in ms, so every timeframe has a bar starting on it. */
const T0 = Date.UTC(2024, 0, 1);
const at = (minute: number): number => T0 + minute * MINUTE;
const minuteOf = (time: number): number => (time - T0) / MINUTE;
const bar = (minute: number, close = minute): OHLCBar => ({ time: at(minute), open: close, high: close, low: close, close, volume: 1 });
const HISTORY = [bar(1), bar(2), bar(3)];

interface Load {
  symbol: string;
  timeframe: TimeFrame;
  countBack: number | undefined;
  signal?: AbortSignal;
  resolve: (bars: OHLCBar[]) => void;
  reject: (err: Error) => void;
}

interface SourceOptions {
  supportedTimeframes?: TimeFrame[];
  /** Recent trades, for tick timeframes. */
  trades?: Trade[];
}

/** A source the test drives: it answers the loads and sends what a live subscription would. */
interface Source {
  config: Pick<StreamConfig, 'adapter' | 'feed'>;
  /** Every first load asked for, in order. */
  loads: Load[];
  /** Every live subscription started, in order. */
  subscribed: BarsSubscription[];
  /** Whether a live subscription is running. */
  live(): boolean;
  bar(bar: OHLCBar, closed: boolean): void;
  tick(tick: RawTick): void;
  connection(state: ConnectionState): void;
  symbolInfo(info: SymbolInfo): void;
  error(message: string): void;
  trades(trades: Trade[]): void;
}

function tradeMethods(options: SourceOptions, onTrades: { current: ((trades: Trade[]) => void) | null }) {
  if (!options.trades) return {};
  return {
    fetchTrades: async () => options.trades!,
    subscribeTrades: (_symbol: string, handler: (trades: Trade[]) => void) => {
      onTrades.current = handler;
      return () => { onTrades.current = null; };
    },
  };
}

function adapterSource(options: SourceOptions = {}): Source & { adapter: DataAdapter; calls: string[] } {
  const loads: Load[] = [];
  const subscribed: BarsSubscription[] = [];
  const calls: string[] = [];
  const listeners = new Map<string, Set<DataAdapterListener>>();
  const onTrades = { current: null as ((trades: Trade[]) => void) | null };
  let connected = false;
  const emit = (type: DataAdapterEventType, data: unknown): void => {
    for (const l of [...(listeners.get(type) ?? [])]) l({ type, data, timestamp: 0 });
  };
  const adapter: DataAdapter = {
    name: 'adapter',
    ...(options.supportedTimeframes ? { supportedTimeframes: options.supportedTimeframes } : {}),
    ...tradeMethods(options, onTrades),
    connect: (cfg) => {
      calls.push('connect');
      connected = true;
      subscribed.push({ symbol: cfg.symbol, timeframe: cfg.timeframe });
    },
    disconnect: () => {
      calls.push('disconnect');
      connected = false;
    },
    getConnectionState: () => (connected ? 'connected' : 'disconnected'),
    fetchHistory: (symbol, timeframe, limit) =>
      new Promise<OHLCBar[]>((resolve, reject) => { loads.push({ symbol, timeframe, countBack: limit, resolve, reject }); }),
    on: (event, listener) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(listener as DataAdapterListener);
    },
    off: (event, listener) => { listeners.get(event)?.delete(listener as DataAdapterListener); },
    dispose: () => {},
  };
  return {
    config: { adapter },
    adapter,
    calls,
    loads,
    subscribed,
    live: () => connected,
    bar: (b, closed) => emit('bar', { bar: b, closed }),
    tick: (t) => emit('tick', t),
    connection: (state) => emit('connectionChange', state),
    symbolInfo: (info) => emit('symbolInfo', info),
    error: (message) => emit('error', { message }),
    trades: (trades) => onTrades.current?.(trades),
  };
}

interface FeedSub {
  request: BarsSubscription;
  subscriber: FeedSubscriber;
  stopped: boolean;
}

function feedSource(options: SourceOptions = {}, asChart = false): Source & { feed: DataFeed; subs: FeedSub[]; calls: string[] } {
  const loads: Load[] = [];
  const subs: FeedSub[] = [];
  const calls: string[] = [];
  const onTrades = { current: null as ((trades: Trade[]) => void) | null };
  const feed: DataFeed = {
    name: 'feed',
    ...(options.supportedTimeframes ? { supportedTimeframes: options.supportedTimeframes } : {}),
    ...tradeMethods(options, onTrades),
    getBars: ({ symbol, timeframe, countBack, before, signal }) => {
      if (before !== undefined) return Promise.resolve([]); // no older bars to page in
      return new Promise<OHLCBar[]>((resolve, reject) => { loads.push({ symbol, timeframe, countBack, signal, resolve, reject }); });
    },
    subscribeBars: (request, subscriber) => {
      calls.push('subscribe');
      const sub: FeedSub = { request, subscriber, stopped: false };
      subs.push(sub);
      return () => {
        calls.push('unsubscribe');
        sub.stopped = true;
      };
    },
  };
  const each = (send: (subscriber: FeedSubscriber) => void): void => {
    for (const sub of subs) if (!sub.stopped) send(sub.subscriber);
  };
  return {
    config: asChart ? { adapter: adapterFromFeed(feed) } : { feed },
    feed,
    subs,
    calls,
    loads,
    get subscribed() { return subs.map((s) => s.request); },
    live: () => subs.some((s) => !s.stopped),
    bar: (b, closed) => each((s) => s.bar(b, closed)),
    tick: (t) => each((s) => s.tick(t)),
    connection: (state) => each((s) => s.connection(state)),
    symbolInfo: (info) => each((s) => s.symbolInfo(info)),
    error: (message) => each((s) => s.error(message)),
    trades: (trades) => onTrades.current?.(trades),
  };
}

const KINDS: [string, (options?: SourceOptions) => Source][] = [
  ['an adapter', (options) => adapterSource(options)],
  ['a feed', (options) => feedSource(options)],
  ['a feed as a chart hands it over', (options) => feedSource(options, true)],
];

/** What the stream sent, in order, as short lines. */
function record(sm: StreamManager) {
  const log: string[] = [];
  const snapshots: OHLCBar[][] = [];
  sm.on('snapshot', (bars) => {
    snapshots.push(bars);
    log.push(`snapshot ${bars.map((b) => b.close).join(',')}`);
  });
  sm.on('barUpdate', (b) => log.push(`update ${minuteOf(b.time)}:${b.close}`));
  sm.on('barClose', (b) => log.push(`close ${minuteOf(b.time)}:${b.close}`));
  sm.on('barCorrection', (b) => log.push(`correction ${minuteOf(b.time)}:${b.close}`));
  sm.on('tick', (t) => log.push(`tick ${t.price}`));
  sm.on('quote', (q) => log.push(`quote ${q.bid}/${q.ask}`));
  sm.on('priceChange', (p) => log.push(`price ${p.price} from ${p.previousClose}`));
  sm.on('connectionChange', (c) => log.push(`state ${c.state}`));
  sm.on('error', (e) => log.push(`error ${e.message}${e.code ? ` [${e.code}]` : ''}`));
  sm.on('symbolInfo', (info) => log.push(`info ${info.symbol}`));
  return { log, snapshots };
}

const RETRY = { enabled: true, maxRetries: 2, baseDelay: 100, maxDelay: 100, backoffMultiplier: 1 };
/** Past any retry's delay, jitter included. */
const RETRY_WAIT = 200;

/** A stream connected to `source`, its history loaded and its connection up. */
async function connected(source: Source, extra: Partial<StreamConfig> = {}) {
  const sm = new StreamManager();
  const recorded = record(sm);
  const done = sm.connect({ ...source.config, symbol: 'AAA', timeframe: '1m', reconnect: RETRY, ...extra });
  source.loads[0].resolve(HISTORY);
  await done;
  source.connection('connected');
  return { sm, ...recorded };
}

afterEach(() => {
  vi.useRealTimers();
});

describe.each(KINDS)('StreamManager on %s', (_kind, make) => {
  it('loads the history, then subscribes to the series, and says it is connected', async () => {
    const source = make();
    const sm = new StreamManager();
    const { log } = record(sm);

    const done = sm.connect({ ...source.config, symbol: 'AAA', timeframe: '1m', historyLimit: 250 });
    expect(source.loads).toHaveLength(1);
    expect(source.loads[0]).toMatchObject({ symbol: 'AAA', timeframe: '1m', countBack: 250 });
    expect(source.subscribed).toEqual([]); // not before the history is in
    source.loads[0].resolve(HISTORY);
    await done;
    source.connection('connected');

    expect(source.subscribed).toEqual([{ symbol: 'AAA', timeframe: '1m' }]);
    expect(log).toEqual(['state connecting', 'price 3 from 3', 'snapshot 1,2,3', 'state connected']);
    expect(sm.getLastPrice()).toBe(3);
    sm.dispose();
  });

  it('asks for 500 bars when no limit is given', async () => {
    const source = make();
    const sm = new StreamManager();
    void sm.connect({ ...source.config, symbol: 'AAA', timeframe: '1m' });
    expect(source.loads[0].countBack).toBe(500);
    sm.dispose();
  });

  it('sends the forming bar, a closed one, a new one and a correction of one past', async () => {
    const source = make();
    const { sm, log } = await connected(source);
    log.length = 0;

    source.bar(bar(3, 3.5), false); // the forming bar again
    source.bar(bar(3, 3.6), true); // its final values
    source.bar(bar(4, 4), false); // a new bar
    source.bar(bar(2, 2.5), true); // the feed's last word on a bar past
    source.bar(bar(2, 2.7), false); // a stale frame

    expect(log).toEqual([
      'update 3:3.5', 'price 3.5 from 3',
      'close 3:3.6',
      'update 4:4', 'price 4 from 3.6',
      'correction 2:2.5',
    ]);
    sm.dispose();
  });

  it('sends ticks and quotes, and moves the price with them', async () => {
    const source = make();
    const { sm, log } = await connected(source);
    log.length = 0;

    source.tick({ time: at(4), price: 5, volume: 1 });
    source.tick({ time: at(4) + 1, price: 6, volume: 1, bid: 5.9, ask: 6.1 });

    expect(log).toEqual(['tick 5', 'price 5 from 3', 'tick 6', 'quote 5.9/6.1', 'price 6 from 3']);
    sm.dispose();
  });

  it('builds the bars from ticks with aggregateTicks', async () => {
    const source = make();
    const { sm, log } = await connected(source, { aggregateTicks: true });
    log.length = 0;

    source.tick({ time: at(3) + 5, price: 5, volume: 2 });
    source.tick({ time: at(4), price: 6, volume: 1 });

    expect(log).toEqual(['tick 5', 'update 3:5', 'price 5 from 3', 'tick 6', 'close 3:5', 'update 4:6', 'price 6 from 5']);
    sm.dispose();
  });

  it.each(['disconnected', 'error'] as const)('loads and subscribes again, after the backoff, when the source says %s', async (dropped) => {
    vi.useFakeTimers();
    const source = make();
    const { sm, log } = await connected(source);
    log.length = 0;

    source.connection(dropped);
    expect(log).toEqual(['state reconnecting', 'state reconnecting']); // the state, then the attempt
    expect(sm.getConnectionInfo().reconnectAttempt).toBe(1);
    expect(source.loads).toHaveLength(1); // not before the backoff
    await vi.advanceTimersByTimeAsync(RETRY_WAIT);
    expect(source.loads).toHaveLength(2);
    expect(source.loads[1]).toMatchObject({ symbol: 'AAA', timeframe: '1m' });
    source.loads[1].resolve([...HISTORY, bar(4)]);
    await vi.advanceTimersByTimeAsync(0);
    source.connection('connected');

    expect(source.subscribed).toEqual([{ symbol: 'AAA', timeframe: '1m' }, { symbol: 'AAA', timeframe: '1m' }]);
    expect(source.live()).toBe(true);
    expect(log.slice(2)).toEqual(['state connecting', 'price 4 from 4', 'snapshot 1,2,3,4', 'state connected']);
    expect(sm.getConnectionInfo().reconnectAttempt).toBe(0);
    sm.dispose();
  });

  it('reports a load that failed, tries again after the backoff, and gives up after the last retry', async () => {
    vi.useFakeTimers();
    const source = make();
    const sm = new StreamManager();
    const { log } = record(sm);

    const done = sm.connect({ ...source.config, symbol: 'AAA', timeframe: '1m', reconnect: RETRY });
    source.loads[0].reject(new Error('boom'));
    await done;
    expect(log).toEqual(['state connecting', 'error boom [CONNECT_FAILED]', 'state error', 'state reconnecting', 'state reconnecting']);
    expect(source.subscribed).toEqual([]);

    await vi.advanceTimersByTimeAsync(RETRY_WAIT);
    source.loads[1].reject(new Error('boom 2'));
    await vi.advanceTimersByTimeAsync(RETRY_WAIT);
    source.loads[2].reject(new Error('boom 3'));
    await vi.advanceTimersByTimeAsync(RETRY_WAIT);

    expect(source.loads).toHaveLength(3);
    expect(log.slice(-2)).toEqual(['state error', 'error Reconnection failed after 2 attempts [RECONNECT_EXHAUSTED]']);
    sm.dispose();
  });

  it('a retry that loads brings the stream up', async () => {
    vi.useFakeTimers();
    const source = make();
    const sm = new StreamManager();
    const { log } = record(sm);

    const done = sm.connect({ ...source.config, symbol: 'AAA', timeframe: '1m', reconnect: RETRY });
    source.loads[0].reject(new Error('boom'));
    await done;
    await vi.advanceTimersByTimeAsync(RETRY_WAIT);
    source.loads[1].resolve(HISTORY);
    await vi.advanceTimersByTimeAsync(0);
    source.connection('connected');

    expect(log.slice(-4)).toEqual(['state connecting', 'price 3 from 3', 'snapshot 1,2,3', 'state connected']);
    expect(source.subscribed).toEqual([{ symbol: 'AAA', timeframe: '1m' }]);
    sm.dispose();
  });

  it('a switch stops the live bars, loads the new series and subscribes to it', async () => {
    const source = make();
    const { sm, log } = await connected(source);
    log.length = 0;

    const done = sm.switchTo('BBB', '5m');
    expect(source.live()).toBe(false);
    expect(sm.getLastPrice()).toBeNull();
    expect(source.loads[1]).toMatchObject({ symbol: 'BBB', timeframe: '5m' });
    source.loads[1].resolve([bar(5, 50), bar(10, 60)]);
    await done;
    source.connection('connected');

    expect(source.subscribed.at(-1)).toEqual({ symbol: 'BBB', timeframe: '5m' });
    expect(source.live()).toBe(true);
    expect(log).toEqual(['state connecting', 'price 60 from 60', 'snapshot 50,60', 'state connected']);
    sm.dispose();
  });

  it('drops the history of a switch that a newer switch overtook', async () => {
    const source = make();
    const { sm, snapshots } = await connected(source);

    const slow = sm.switchTo('AAA', '1h');
    const fast = sm.switchTo('AAA', '4h');
    source.loads[2].resolve([bar(240, 4)]);
    await fast;
    source.loads[1].resolve([bar(60, 60)]);
    await slow;

    expect(snapshots.map((s) => s.at(-1)?.close)).toEqual([3, 4]);
    expect(source.subscribed.map((s) => s.timeframe)).toEqual(['1m', '4h']);
    sm.dispose();
  });

  it('drops the failure of a load a switch overtook: no error, no retry', async () => {
    vi.useFakeTimers();
    const source = make();
    const sm = new StreamManager();
    const { log } = record(sm);

    const first = sm.connect({ ...source.config, symbol: 'AAA', timeframe: '1m', reconnect: RETRY });
    const second = sm.switchTo('BBB', '1m');
    source.loads[0].reject(new Error('stale'));
    await first;
    source.loads[1].resolve(HISTORY);
    await second;
    await vi.advanceTimersByTimeAsync(10 * RETRY_WAIT);

    expect(log.filter((l) => l.startsWith('error'))).toEqual([]);
    expect(source.loads).toHaveLength(2);
    sm.dispose();
  });

  it('a disconnect during the load leaves nothing behind: no snapshot, no subscription', async () => {
    const source = make();
    const sm = new StreamManager();
    const { log } = record(sm);

    const done = sm.connect({ ...source.config, symbol: 'AAA', timeframe: '1m' });
    sm.disconnect();
    source.loads[0].resolve(HISTORY);
    await done;

    expect(log).toEqual(['state connecting', 'state disconnected']);
    expect(source.subscribed).toEqual([]);
    expect(source.live()).toBe(false);
  });

  it('a disconnect stops the live bars and the retries', async () => {
    vi.useFakeTimers();
    const source = make();
    const { sm, log } = await connected(source);
    source.connection('disconnected'); // a retry is waiting
    log.length = 0;

    sm.disconnect();
    await vi.advanceTimersByTimeAsync(10 * RETRY_WAIT);

    expect(source.live()).toBe(false);
    expect(source.loads).toHaveLength(1);
    expect(log).toEqual(['state disconnected']);
    expect(sm.getLastPrice()).toBeNull();
  });

  it('connecting again takes the place of the connection before', async () => {
    const source = make();
    const { sm, log } = await connected(source);
    log.length = 0;

    const done = sm.connect({ ...source.config, symbol: 'BBB', timeframe: '1m' });
    expect(source.live()).toBe(false);
    source.loads[1].resolve([bar(1, 9)]);
    await done;

    expect(source.subscribed.at(-1)).toEqual({ symbol: 'BBB', timeframe: '1m' });
    expect(log.slice(0, 4)).toEqual(['state disconnected', 'state connecting', 'price 9 from 9', 'snapshot 9']);
    sm.dispose();
  });

  it('passes on what the source learned about the symbol, and its errors', async () => {
    const source = make();
    const { sm, log } = await connected(source);
    log.length = 0;

    source.symbolInfo({ symbol: 'AAA', pricePrecision: 2 } as SymbolInfo);
    source.symbolInfo(null as unknown as SymbolInfo); // not an answer
    source.error('rate limited');

    expect(log).toEqual(['info AAA', 'error rate limited']);
    expect(sm.getConnectionState()).toBe('connected'); // an error alone drops nothing
    sm.dispose();
  });

  it('builds a timeframe the source lacks from one it has: the history and the live bars', async () => {
    const source = make({ supportedTimeframes: ['1m'] });
    const sm = new StreamManager();
    const { log } = record(sm);

    const done = sm.connect({ ...source.config, symbol: 'AAA', timeframe: '3m', historyLimit: 2 });
    expect(source.loads[0].timeframe).toBe('1m');
    source.loads[0].resolve([bar(0), bar(1), bar(2), bar(3), bar(4)]);
    await done;
    source.connection('connected');
    expect(source.subscribed).toEqual([{ symbol: 'AAA', timeframe: '1m' }]);
    expect(log).toEqual(['state connecting', 'price 4 from 4', 'snapshot 2,4', 'state connected']);
    log.length = 0;

    source.bar(bar(5, 7), true); // the last minute of the 3m bar
    source.bar(bar(6, 8), false); // the first of the next

    expect(log).toEqual(['close 3:7', 'update 6:8', 'price 8 from 7']);
    sm.dispose();
  });

  it('switches from a timeframe it builds to one the source has', async () => {
    const source = make({ supportedTimeframes: ['1m', '1h'] });
    const sm = new StreamManager();
    const { snapshots } = record(sm);

    const done = sm.connect({ ...source.config, symbol: 'AAA', timeframe: '2m' });
    source.loads[0].resolve([bar(0), bar(1)]);
    await done;
    const switched = sm.switchTo('AAA', '1h');
    expect(source.loads[1].timeframe).toBe('1h');
    source.loads[1].resolve([bar(60, 60)]);
    await switched;

    expect(snapshots.map((s) => s.length)).toEqual([1, 1]);
    expect(source.subscribed.map((s) => s.timeframe)).toEqual(['1m', '1h']);
    sm.dispose();
  });

  it("builds tick bars from the source's trades: the history and the live bars", async () => {
    const trade = (time: number, price: number): Trade => ({ time, price, volume: 1 });
    const source = make({ trades: [trade(1, 10), trade(2, 11), trade(3, 12)] });
    const sm = new StreamManager();
    const { log, snapshots } = record(sm);

    await sm.connect({ ...source.config, symbol: 'AAA', timeframe: '2T' as TimeFrame });
    expect(source.loads).toEqual([]); // no bars asked of the source
    expect(snapshots[0].map((b) => b.close)).toEqual([11, 12]);
    expect(sm.getConnectionState()).toBe('connected');
    log.length = 0;

    source.trades([trade(4, 13)]);

    expect(log.filter((l) => l.startsWith('update') || l.startsWith('close'))).toHaveLength(1);
    expect(sm.getLastPrice()).toBe(13);
    sm.dispose();
    expect(source.live()).toBe(false);
  });

  it('wake after a network change loads and subscribes again at once', async () => {
    const source = make();
    const { sm, log } = await connected(source);
    log.length = 0;

    sm.wake('online');
    expect(source.live()).toBe(false);
    expect(source.loads).toHaveLength(2);
    source.loads[1].resolve(HISTORY);
    await Promise.resolve();
    await Promise.resolve();
    source.connection('connected');

    expect(source.live()).toBe(true);
    expect(log).toEqual(['state connecting', 'snapshot 1,2,3', 'state connected']);
    sm.dispose();
  });

  it('hears nothing from the source once disconnected', async () => {
    const source = make();
    const { sm, log } = await connected(source);
    sm.disconnect();
    log.length = 0;

    source.bar(bar(4), false);
    source.tick({ time: at(4), price: 5, volume: 1 });
    source.connection('disconnected');
    source.symbolInfo({ symbol: 'AAA' } as SymbolInfo);
    source.error('late');

    expect(log).toEqual([]);
  });
});

describe('StreamManager on an adapter', () => {
  it('hears the adapter from the connect on: what it sends while the history loads', async () => {
    const source = adapterSource();
    const sm = new StreamManager();
    const { log } = record(sm);

    const done = sm.connect({ ...source.config, symbol: 'AAA', timeframe: '1m' });
    source.symbolInfo({ symbol: 'AAA' } as SymbolInfo);
    source.error('slow');
    source.loads[0].resolve(HISTORY);
    await done;

    expect(log).toEqual(['state connecting', 'info AAA', 'error slow', 'price 3 from 3', 'snapshot 1,2,3']);
    sm.dispose();
  });

  it('reconnects with a connect alone: the adapter replaces its own stream', async () => {
    vi.useFakeTimers();
    const source = adapterSource();
    const { sm } = await connected(source);
    source.calls.length = 0;

    source.connection('disconnected');
    await vi.advanceTimersByTimeAsync(RETRY_WAIT);
    source.loads[1].resolve(HISTORY);
    await vi.advanceTimersByTimeAsync(0);

    expect(source.calls).toEqual(['connect']);
    sm.dispose();
  });

  it('disconnects the adapter on a switch, a wake, and a disconnect', async () => {
    const source = adapterSource();
    const { sm } = await connected(source);
    source.calls.length = 0;

    const switched = sm.switchTo('BBB', '1m');
    source.loads[1].resolve(HISTORY);
    await switched;
    source.connection('connected');
    sm.wake('online');
    source.loads[2].resolve(HISTORY);
    await Promise.resolve();
    await Promise.resolve();
    sm.disconnect();

    expect(source.calls).toEqual(['disconnect', 'connect', 'disconnect', 'connect', 'disconnect']);
  });

  it('takes a silent connection for a dead one: a heartbeat timeout, then a reconnect', async () => {
    vi.useFakeTimers();
    const source = adapterSource();
    const { sm, log } = await connected(source);
    log.length = 0;

    await vi.advanceTimersByTimeAsync(91_000);

    expect(log.slice(0, 2)).toEqual(['error Heartbeat timeout [HEARTBEAT_TIMEOUT]', 'state reconnecting']);
    expect(source.loads.length).toBeGreaterThan(1);
    sm.dispose();
  });

  it('names an error the adapter sent without a message', async () => {
    const source = adapterSource();
    const { sm, log } = await connected(source);
    log.length = 0;
    (source.error as (message?: string) => void)(undefined);
    expect(log).toEqual(['error Adapter error']);
    sm.dispose();
  });
});

describe.each([
  ['a feed', false],
  ['a feed as a chart hands it over', true],
])('StreamManager on %s', (_kind, asChart) => {
  it('is connected once subscribed, when the feed says nothing of its connection', async () => {
    const source = feedSource({}, asChart);
    const sm = new StreamManager();
    const { log } = record(sm);
    const done = sm.connect({ ...source.config, symbol: 'AAA', timeframe: '1m' });
    source.loads[0].resolve(HISTORY);
    await done;
    expect(log).toEqual(['state connecting', 'price 3 from 3', 'snapshot 1,2,3', 'state connected']);
    sm.dispose();
  });

  it('follows the connection the feed reports while subscribing instead', async () => {
    const source = feedSource({}, asChart);
    const subscribeBars = source.feed.subscribeBars.bind(source.feed);
    source.feed.subscribeBars = (request, subscriber) => {
      const stop = subscribeBars(request, subscriber);
      subscriber.connection('connecting');
      return stop;
    };
    const sm = new StreamManager();
    const done = sm.connect({ ...source.config, symbol: 'AAA', timeframe: '1m' });
    source.loads[0].resolve(HISTORY);
    await done;
    expect(sm.getConnectionState()).toBe('connecting');
    sm.dispose();
  });

  it('unsubscribes before it subscribes again on a reconnect, and keeps the loads of the series', async () => {
    vi.useFakeTimers();
    const source = feedSource({}, asChart);
    const { sm } = await connected(source);
    source.calls.length = 0;

    source.connection('disconnected');
    await vi.advanceTimersByTimeAsync(RETRY_WAIT);
    source.loads[1].resolve(HISTORY);
    await vi.advanceTimersByTimeAsync(0);

    expect(source.calls).toEqual(['unsubscribe', 'subscribe']);
    expect(source.loads[1].signal?.aborted).toBe(false);
    sm.dispose();
  });

  it('aborts the loads of the series it streamed when it switches away, wakes or disconnects', async () => {
    const source = feedSource({}, asChart);
    const { sm } = await connected(source);
    expect(source.loads[0].signal?.aborted).toBe(false);

    const switched = sm.switchTo('BBB', '1m');
    expect(source.loads[0].signal?.aborted).toBe(true);
    source.loads[1].resolve(HISTORY);
    await switched;
    expect(source.loads[1].signal?.aborted).toBe(false);
    sm.disconnect();
    expect(source.loads[1].signal?.aborted).toBe(true);
  });

  it('drops what a subscription it stopped still sends', async () => {
    const source = feedSource({}, asChart);
    const { sm, log } = await connected(source);
    const old = source.subs[0].subscriber;
    const switched = sm.switchTo('BBB', '1m');
    source.loads[1].resolve(HISTORY);
    await switched;
    log.length = 0;

    old.bar(bar(9, 99), false);
    old.tick({ time: at(9), price: 99, volume: 1 });
    old.connection('disconnected');
    old.symbolInfo({ symbol: 'AAA' } as SymbolInfo);
    old.error('late');

    expect(log).toEqual([]);
    expect(sm.getConnectionState()).toBe('connected');
    sm.dispose();
  });

  it('stays connected through silence', async () => {
    vi.useFakeTimers();
    const source = feedSource({}, asChart);
    const { sm, log } = await connected(source);
    log.length = 0;
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    sm.wake('visible');
    expect(log).toEqual([]);
    expect(source.loads).toHaveLength(1);
    sm.dispose();
  });
});

describe('StreamManager on a ManualFeed', () => {
  it('loads what the feed holds, streams what it is pushed, and loads it again on a switch back', async () => {
    const feed = new ManualFeed();
    feed.setBars('AAA', '1m', HISTORY);
    feed.setBars('BBB', '1m', [bar(1, 70)]);
    const sm = new StreamManager();
    const { log } = record(sm);

    await sm.connect({ feed, symbol: 'AAA', timeframe: '1m' });
    feed.pushBar('AAA', '1m', bar(4, 4.5));
    await sm.switchTo('BBB', '1m');
    feed.pushBar('AAA', '1m', bar(5, 5.5)); // no longer watched
    await sm.switchTo('AAA', '1m');

    expect(log).toEqual([
      'state connecting', 'price 3 from 3', 'snapshot 1,2,3', 'state connected',
      'update 4:4.5', 'price 4.5 from 3',
      'state connecting', 'price 70 from 70', 'snapshot 70', 'state connected',
      'state connecting', 'price 5.5 from 5.5', 'snapshot 1,2,3,4.5,5.5', 'state connected',
    ]);
    sm.dispose();
  });
});
