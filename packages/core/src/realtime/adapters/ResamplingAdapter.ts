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
} from '@tradecanvas/commons';
import {
  parseTimeframe,
  pickBaseTimeframe,
  resampleBars,
  timeframeBucketStart,
  timeframeToMs,
} from '@tradecanvas/commons';

/** Most base bars asked for in one request (Binance and Bybit stop at 1000). */
const MAX_BASE_BARS_PER_REQUEST = 1000;

/** Most requests one history call makes to the feed; beyond it fewer bars come back. */
export const MAX_BASE_REQUESTS = 10;

/** Most base bars one target bar may take (1440 = a day from minutes). */
export const MAX_BASE_RATIO = 1440;

const FORWARDED: DataAdapterEventType[] = ['tick', 'barClose', 'snapshot', 'connectionChange', 'error'];

const wrapped = new WeakMap<DataAdapter, ResamplingAdapter>();

/**
 * The adapter itself when it serves every timeframe (no
 * `supportedTimeframes`), else one `ResamplingAdapter` around it — the same
 * one on every call.
 */
export function withResampling(adapter: DataAdapter): DataAdapter {
  if (adapter instanceof ResamplingAdapter || !adapter.supportedTimeframes?.length) return adapter;
  let out = wrapped.get(adapter);
  if (!out) {
    out = new ResamplingAdapter(adapter, adapter.supportedTimeframes);
    wrapped.set(adapter, out);
  }
  return out;
}

/** The feed timeframe that builds `target`, or null when none does at a sane ratio. */
function baseTimeframe(target: TimeFrame, supported: readonly TimeFrame[]): TimeFrame | null {
  if (supported.includes(target)) return target;
  const base = pickBaseTimeframe(target, supported);
  if (!base) return null;
  return Math.ceil(timeframeToMs(target) / timeframeToMs(base)) <= MAX_BASE_RATIO ? base : null;
}

/**
 * Whether `adapter` can serve `timeframe`: it serves every timeframe, lists
 * it, or can build it from one it lists without needing more than
 * `MAX_BASE_RATIO` of its bars per bar.
 */
export function servesTimeframe(adapter: DataAdapter, timeframe: TimeFrame): boolean {
  const supported = adapter.supportedTimeframes;
  return !supported?.length || baseTimeframe(timeframe, supported) !== null;
}

/** Start of the base bar after the one starting at `time`, on the calendar for weeks and months. */
function nextBaseStart(time: number, base: TimeFrame): number {
  const parsed = parseTimeframe(base);
  if (parsed?.unit === 'M') {
    const d = new Date(time);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + parsed.count, 1);
  }
  return time + timeframeToMs(base);
}

/** Merge base bars (oldest first) into one bar stamped `time`. */
function compose(time: number, parts: readonly OHLCBar[]): OHLCBar {
  const first = parts[0];
  const out: OHLCBar = { time, open: first.open, high: first.high, low: first.low, close: first.close, volume: first.volume };
  for (let i = 1; i < parts.length; i++) {
    const bar = parts[i];
    if (bar.high > out.high) out.high = bar.high;
    if (bar.low < out.low) out.low = bar.low;
    out.close = bar.close;
    out.volume += bar.volume;
  }
  return out;
}

/** The base bars of the newest bucket a history call served, to resume from on connect. */
interface ServedTail {
  symbol: string;
  target: TimeFrame;
  bucket: number;
  bars: OHLCBar[];
}

/**
 * Serves timeframes a feed lacks by building them from one it has: 7m from
 * 1m, 90m from 30m, a quarter from months.
 *
 * - History is fetched in the base timeframe, paging back through
 *   `fetchHistoryBefore` when one request holds too few bars (at most
 *   `MAX_BASE_REQUESTS` requests), and merged per bucket.
 * - Live base bars are kept by time within the forming bucket, so a feed
 *   that never flags a bar closed, or repeats a frame, still builds it right.
 *   The bucket closes with its last base bar, or when the next bucket's first
 *   bar arrives. It starts from the base bars history served for it.
 * - Timeframes the feed has pass straight through; one it cannot build is
 *   refused rather than served as another.
 */
export class ResamplingAdapter implements DataAdapter {
  readonly name: string;
  readonly fetchHistoryBefore?: (symbol: string, timeframe: TimeFrame, before: number, limit: number) => Promise<OHLCBar[]>;
  readonly searchSymbols?: (query: string, options?: SymbolSearchOptions) => Promise<SymbolInfo[]>;
  readonly resolveSymbol?: (symbol: string) => Promise<SymbolInfo | null>;
  readonly subscribeQuotes?: (symbols: readonly string[], onQuotes: (quotes: Quote[]) => void) => () => void;
  readonly fetchNews?: (symbol: string, limit?: number) => Promise<NewsItem[]>;

  private readonly listeners = new Map<DataAdapterEventType, Set<DataAdapterListener>>();
  private readonly unsubscribe: (() => void)[] = [];
  /** The live subscription: target and base timeframes when they differ. */
  private live: { symbol: string; target: TimeFrame; base: TimeFrame } | null = null;
  private bucket: number | null = null;
  /** The forming bucket's base bars, by time. */
  private parts = new Map<number, OHLCBar>();
  private tail: ServedTail | null = null;
  /** Bumped by connect and disconnect: history paging in progress stops. */
  private generation = 0;

  constructor(private readonly inner: DataAdapter, private readonly baseTimeframes: readonly TimeFrame[]) {
    this.name = inner.name;
    if (inner.fetchHistoryBefore) {
      this.fetchHistoryBefore = (symbol, timeframe, before, limit) => this.historyBefore(symbol, timeframe, before, limit);
    }
    if (inner.searchSymbols) this.searchSymbols = inner.searchSymbols.bind(inner);
    if (inner.resolveSymbol) this.resolveSymbol = inner.resolveSymbol.bind(inner);
    if (inner.subscribeQuotes) this.subscribeQuotes = inner.subscribeQuotes.bind(inner);
    if (inner.fetchNews) this.fetchNews = inner.fetchNews.bind(inner);
    this.listen('bar', (e) => this.onBar(e));
    for (const type of FORWARDED) this.listen(type, (e) => this.emit(type, e.data));
  }

  /** The timeframe to fetch for `timeframe`: itself when served, else the closest one that builds it. */
  baseFor(timeframe: TimeFrame): TimeFrame {
    const base = baseTimeframe(timeframe, this.baseTimeframes);
    if (!base) throw new RangeError(`${this.name} cannot serve the ${timeframe} timeframe`);
    return base;
  }

  connect(config: DataAdapterConfig): void {
    const base = this.baseFor(config.timeframe);
    this.generation++;
    this.resetBucket();
    this.live = base === config.timeframe ? null : { symbol: config.symbol, target: config.timeframe, base };
    if (this.live) this.resumeFromHistory(this.live.symbol, this.live.target);
    this.inner.connect({ ...config, timeframe: base });
  }

  disconnect(): void {
    this.generation++;
    this.inner.disconnect();
    this.resetBucket();
    this.live = null;
  }

  getConnectionState(): ConnectionState {
    return this.inner.getConnectionState();
  }

  async fetchHistory(symbol: string, timeframe: TimeFrame, limit = 500): Promise<OHLCBar[]> {
    const base = this.baseFor(timeframe);
    if (base === timeframe) return this.inner.fetchHistory(symbol, timeframe, limit);
    const generation = this.generation;
    const want = this.baseBarsFor(timeframe, base, limit);
    const first = await this.inner.fetchHistory(symbol, base, Math.min(want, MAX_BASE_BARS_PER_REQUEST));
    const bars = await this.extendBack(symbol, base, first, want, generation);
    this.rememberTail(symbol, timeframe, bars);
    return this.toTarget(bars, timeframe, limit);
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
    this.generation++;
    for (const off of this.unsubscribe) off();
    this.unsubscribe.length = 0;
    this.listeners.clear();
    this.inner.dispose();
  }

  // --- History ---

  private async historyBefore(symbol: string, timeframe: TimeFrame, before: number, limit: number): Promise<OHLCBar[]> {
    const fetchBefore = this.inner.fetchHistoryBefore!.bind(this.inner);
    const base = this.baseFor(timeframe);
    if (base === timeframe) return fetchBefore(symbol, timeframe, before, limit);
    const generation = this.generation;
    const want = this.baseBarsFor(timeframe, base, limit);
    const first = await fetchBefore(symbol, base, before, Math.min(want, MAX_BASE_BARS_PER_REQUEST));
    const bars = await this.extendBack(symbol, base, first.filter((b) => b.time < before), want, generation, 1);
    return this.toTarget(bars, timeframe, limit);
  }

  /** Base bars for `limit` target bars, plus one bucket for a partial first one. */
  private baseBarsFor(target: TimeFrame, base: TimeFrame, limit: number): number {
    return (limit + 1) * Math.ceil(timeframeToMs(target) / timeframeToMs(base));
  }

  /**
   * Page back until `want` base bars are in, the history starts, the feed
   * stops going back, the request budget is spent, or the adapter
   * (re)connected or disconnected meanwhile.
   */
  private async extendBack(
    symbol: string,
    base: TimeFrame,
    bars: OHLCBar[],
    want: number,
    generation: number,
    requestsMade = 1,
  ): Promise<OHLCBar[]> {
    const fetchBefore = this.inner.fetchHistoryBefore?.bind(this.inner);
    let out = bars;
    let requests = requestsMade;
    while (fetchBefore && out.length > 0 && out.length < want && requests < MAX_BASE_REQUESTS) {
      if (generation !== this.generation) break;
      const oldest = out[0].time;
      const page = await fetchBefore(symbol, base, oldest, Math.min(want - out.length, MAX_BASE_BARS_PER_REQUEST));
      requests++;
      const older = page.filter((b) => b.time < oldest);
      if (older.length === 0) break;
      out = older.concat(out);
    }
    return out;
  }

  /** Merge into target buckets, drop a first bucket the bars start inside, keep the newest `limit`. */
  private toTarget(bars: OHLCBar[], target: TimeFrame, limit: number): OHLCBar[] {
    if (bars.length === 0) return [];
    const out = resampleBars(bars, target);
    if (out.length > 1 && out[0].time !== bars[0].time) out.shift();
    return out.length > limit ? out.slice(out.length - limit) : out;
  }

  /** Keep the newest bucket's base bars, for the live stream to resume from. */
  private rememberTail(symbol: string, target: TimeFrame, bars: OHLCBar[]): void {
    if (bars.length === 0) return;
    const bucket = timeframeBucketStart(bars[bars.length - 1].time, target);
    let i = bars.length;
    while (i > 0 && timeframeBucketStart(bars[i - 1].time, target) === bucket) i--;
    this.tail = { symbol, target, bucket, bars: bars.slice(i) };
  }

  private resumeFromHistory(symbol: string, target: TimeFrame): void {
    const tail = this.tail;
    if (!tail || tail.symbol !== symbol || tail.target !== target) return;
    this.bucket = tail.bucket;
    for (const bar of tail.bars) this.parts.set(bar.time, bar);
  }

  // --- Live bars ---

  private onBar(event: DataAdapterEvent): void {
    const live = this.live;
    if (!live) {
      this.emit('bar', event.data);
      return;
    }
    const { bar, closed } = event.data as { bar: OHLCBar; closed: boolean };
    const bucket = timeframeBucketStart(bar.time, live.target);
    if (this.bucket !== null && bucket < this.bucket) return; // a late frame of a closed bucket
    if (this.bucket !== null && bucket > this.bucket) {
      // A bar of the next bucket: the current one is complete.
      const done = this.composed();
      if (done) this.emit('bar', { bar: done, closed: true });
      this.resetBucket();
    }
    this.bucket = bucket;
    this.parts.set(bar.time, bar);

    const current = this.composed();
    if (!current) return;
    const lastOfBucket = closed && timeframeBucketStart(nextBaseStart(bar.time, live.base), live.target) !== bucket;
    this.emit('bar', { bar: current, closed: lastOfBucket });
    if (lastOfBucket) {
      this.resetBucket();
      // The next bucket starts after this one, never at it again.
      this.bucket = timeframeBucketStart(nextBaseStart(bar.time, live.base), live.target);
    }
  }

  /** The current bucket: its base bars merged in time order. */
  private composed(): OHLCBar | null {
    if (this.bucket === null || this.parts.size === 0) return null;
    const parts = [...this.parts.values()].sort((a, b) => a.time - b.time);
    return compose(this.bucket, parts);
  }

  private resetBucket(): void {
    this.bucket = null;
    this.parts = new Map();
  }

  // --- Events ---

  private listen(type: DataAdapterEventType, handler: (e: DataAdapterEvent) => void): void {
    const listener: DataAdapterListener = (e) => handler(e);
    this.inner.on(type, listener);
    this.unsubscribe.push(() => this.inner.off(type, listener));
  }

  private emit(type: DataAdapterEventType, data: unknown): void {
    const set = this.listeners.get(type);
    if (!set) return;
    const event = { type, data, timestamp: Date.now() };
    for (const listener of set) listener(event);
  }
}
