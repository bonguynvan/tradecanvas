import type {
  ConnectionState,
  DataAdapter,
  DataAdapterConfig,
  DataAdapterEvent,
  DataAdapterEventType,
  DataAdapterListener,
  NewsItem,
  OHLCBar,
  Quote,
  SymbolInfo,
  SymbolSearchOptions,
  TimeFrame,
  Trade,
} from '@tradecanvas/commons';
import { tickBarCount } from '@tradecanvas/commons';

/** Trades a tick chart's history is built from. */
const HISTORY_TRADES = 1000;
/** How often a tick stream says it is still there, under the stream's 60 s heartbeat. */
const KEEP_ALIVE_MS = 15_000;
const EVENT_TYPES: readonly DataAdapterEventType[] = ['tick', 'bar', 'barClose', 'snapshot', 'connectionChange', 'error', 'symbolInfo'];

/**
 * Bars of N trades each: a bar opens with its first trade (and is stamped
 * with its time) and closes with its Nth.
 */
export class TickBarBuilder {
  private bar: OHLCBar | null = null;
  private count = 0;
  /** The last bar's time: a bar never shares one (trades in the same millisecond). */
  private lastTime = -Infinity;

  constructor(private readonly tradesPerBar: number) {}

  /** Add trades; the bars they touched, oldest first: closed ones, then the one left forming. */
  push(trades: readonly Trade[]): { bar: OHLCBar; closed: boolean }[] {
    const out: { bar: OHLCBar; closed: boolean }[] = [];
    let touched = false;
    for (const t of trades) {
      if (!this.bar) {
        const time = Math.max(t.time, this.lastTime + 1);
        this.lastTime = time;
        this.bar = { time, open: t.price, high: t.price, low: t.price, close: t.price, volume: t.volume };
        this.count = 0;
      } else {
        this.bar = {
          ...this.bar,
          high: Math.max(this.bar.high, t.price),
          low: Math.min(this.bar.low, t.price),
          close: t.price,
          volume: this.bar.volume + t.volume,
        };
      }
      this.count++;
      touched = true;
      if (this.count >= this.tradesPerBar) {
        out.push({ bar: this.bar, closed: true });
        this.bar = null;
        touched = false;
      }
    }
    if (touched && this.bar) out.push({ bar: this.bar, closed: false });
    return out;
  }

  /** Every bar of `trades` (the last one may be forming), from a fresh start. */
  build(trades: readonly Trade[]): OHLCBar[] {
    this.bar = null;
    this.count = 0;
    this.lastTime = -Infinity;
    return this.push(trades).map((b) => b.bar);
  }
}

/**
 * Tick timeframes (`'100T'`: bars of 100 trades) for a feed with trades
 * (`fetchTrades` and `subscribeTrades`): history from its recent trades,
 * then live bars from its trades. Time timeframes go to the feed as they are.
 */
export class TickBarAdapter implements DataAdapter {
  readonly name: string;
  readonly supportedTimeframes?: readonly TimeFrame[];
  readonly searchSymbols?: (query: string, options?: SymbolSearchOptions) => Promise<SymbolInfo[]>;
  readonly resolveSymbol?: (symbol: string) => Promise<SymbolInfo | null>;
  readonly subscribeQuotes?: (symbols: readonly string[], onQuotes: (quotes: Quote[]) => void) => () => void;
  readonly fetchNews?: (symbol: string, limit?: number) => Promise<NewsItem[]>;
  readonly fetchTrades: (symbol: string, limit?: number) => Promise<Trade[]>;
  readonly subscribeTrades: (symbol: string, onTrades: (trades: Trade[]) => void) => () => void;

  private readonly listeners = new Map<DataAdapterEventType, Set<DataAdapterListener>>();
  /** The tick chart being served: its builder, and the last trade its history had. */
  private tick: { symbol: string; builder: TickBarBuilder; after: number } | null = null;
  private stopTrades: (() => void) | null = null;
  private keepAlive: ReturnType<typeof setInterval> | null = null;
  private tickMode = false;
  private state: ConnectionState = 'disconnected';

  constructor(private readonly inner: DataAdapter & Required<Pick<DataAdapter, 'fetchTrades' | 'subscribeTrades'>>) {
    this.name = inner.name;
    this.supportedTimeframes = inner.supportedTimeframes;
    if (inner.searchSymbols) this.searchSymbols = inner.searchSymbols.bind(inner);
    if (inner.resolveSymbol) this.resolveSymbol = inner.resolveSymbol.bind(inner);
    if (inner.subscribeQuotes) this.subscribeQuotes = inner.subscribeQuotes.bind(inner);
    if (inner.fetchNews) this.fetchNews = inner.fetchNews.bind(inner);
    this.fetchTrades = inner.fetchTrades.bind(inner);
    this.subscribeTrades = inner.subscribeTrades.bind(inner);
    // The feed's own events, while it serves a time timeframe.
    for (const type of EVENT_TYPES) {
      inner.on(type, (e: DataAdapterEvent) => {
        if (!this.tickMode) this.emit(type, e.data);
      });
    }
  }

  async fetchHistory(symbol: string, timeframe: TimeFrame, limit?: number): Promise<OHLCBar[]> {
    const per = tickBarCount(timeframe);
    if (per === null) return this.inner.fetchHistory(symbol, timeframe, limit);
    const trades = (await this.inner.fetchTrades(symbol, HISTORY_TRADES)).filter(isTrade).sort((a, b) => a.time - b.time);
    const builder = new TickBarBuilder(per);
    const bars = builder.build(trades);
    this.tick = { symbol, builder, after: trades.length ? trades[trades.length - 1].time : -Infinity };
    return limit !== undefined && limit > 0 ? bars.slice(-limit) : bars;
  }

  fetchHistoryBefore(symbol: string, timeframe: TimeFrame, before: number, limit: number): Promise<OHLCBar[]> {
    // Trade feeds keep no older trades to page in.
    if (tickBarCount(timeframe) !== null || !this.inner.fetchHistoryBefore) return Promise.resolve([]);
    return this.inner.fetchHistoryBefore(symbol, timeframe, before, limit);
  }

  connect(config: DataAdapterConfig): void {
    this.disconnect();
    const per = tickBarCount(config.timeframe);
    if (per === null) {
      this.tickMode = false;
      this.inner.connect(config);
      return;
    }
    this.tickMode = true;
    // Live trades carry on the bar the history left forming.
    const tick = this.tick?.symbol === config.symbol ? this.tick : { symbol: config.symbol, builder: new TickBarBuilder(per), after: -Infinity };
    this.tick = tick;
    this.stopTrades = this.inner.subscribeTrades(config.symbol, (trades) => {
      const fresh = trades.filter((t) => isTrade(t) && t.time >= tick.after);
      for (const { bar, closed } of tick.builder.push(fresh)) {
        this.emit('bar', { bar, closed });
        this.emit('tick', { time: bar.time, price: bar.close, volume: bar.volume });
      }
    });
    this.state = 'connected';
    this.emit('connectionChange', 'connected');
    // A quiet market sends no trades for a while: still connected, not timed out.
    this.keepAlive = setInterval(() => this.emit('connectionChange', 'connected'), KEEP_ALIVE_MS);
  }

  disconnect(): void {
    if (this.tickMode) {
      this.stopTrades?.();
      this.stopTrades = null;
      if (this.keepAlive) clearInterval(this.keepAlive);
      this.keepAlive = null;
      this.state = 'disconnected';
    } else {
      this.inner.disconnect();
    }
  }

  getConnectionState(): ConnectionState {
    return this.tickMode ? this.state : this.inner.getConnectionState();
  }

  dispose(): void {
    this.stopTrades?.();
    this.stopTrades = null;
    if (this.keepAlive) clearInterval(this.keepAlive);
    this.keepAlive = null;
    this.listeners.clear();
    this.inner.dispose();
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

  private emit(type: DataAdapterEventType, data: unknown): void {
    const set = this.listeners.get(type);
    if (!set) return;
    const event = { type, data, timestamp: Date.now() };
    for (const listener of set) listener(event);
  }
}

const wrapped = new WeakMap<DataAdapter, TickBarAdapter>();

/** A feed with trades, able to serve tick timeframes too; any other feed as it is. */
export function withTickBars(adapter: DataAdapter): DataAdapter {
  if (adapter instanceof TickBarAdapter || !hasTrades(adapter)) return adapter;
  let out = wrapped.get(adapter);
  if (!out) {
    out = new TickBarAdapter(adapter);
    wrapped.set(adapter, out);
  }
  return out;
}

/** Whether the feed has trades to build tick bars from. */
export function hasTrades(adapter: DataAdapter): adapter is DataAdapter & Required<Pick<DataAdapter, 'fetchTrades' | 'subscribeTrades'>> {
  return typeof adapter.fetchTrades === 'function' && typeof adapter.subscribeTrades === 'function';
}

function isTrade(t: Trade): boolean {
  return Number.isFinite(t?.time) && Number.isFinite(t?.price) && Number.isFinite(t?.volume);
}
