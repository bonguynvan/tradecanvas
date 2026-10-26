import type {
  BucketOptions,
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
import {
  isUtcTimeZone,
  isValidTimeZone,
  offsetAt,
  parseTimeframe,
  pickBaseTimeframe,
  symbolTimeZone,
  tickBarCount,
  resampleBars,
  timeframeBucketStart,
  timeframeFollowsDays,
  timeframeSpansDays,
  timeframeToMs,
  wallToUtc,
} from '@tradecanvas/commons';

/** Most base bars asked for in one request (Binance and Bybit stop at 1000). */
const MAX_BASE_BARS_PER_REQUEST = 1000;

/** Most requests one history call makes to the feed; beyond it fewer bars come back. */
export const MAX_BASE_REQUESTS = 10;

/** Most base bars one target bar may take (1440 = a day from minutes). */
export const MAX_BASE_RATIO = 1440;

/**
 * Longest wait, ms, for the feed to say a symbol's zone (`resolveSymbol`)
 * before its days are built at UTC's midnight instead: a slow or silent feed
 * still gets its chart.
 */
export const SYMBOL_ZONE_WAIT_MS = 5_000;

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

const FORWARDED: DataAdapterEventType[] = ['tick', 'barClose', 'snapshot', 'connectionChange', 'error', 'symbolInfo'];

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

/** The feed timeframe that builds `target` (lined up with `timeZone`'s midnight when given), or null when none does at a sane ratio. */
function baseTimeframe(target: TimeFrame, supported: readonly TimeFrame[], timeZone?: string): TimeFrame | null {
  if (supported.includes(target)) return target;
  const base = pickBaseTimeframe(target, supported, { timeZone });
  if (!base) return null;
  return Math.ceil(timeframeToMs(target) / timeframeToMs(base)) <= MAX_BASE_RATIO ? base : null;
}

/**
 * Whether `adapter` can serve `timeframe`: it serves every timeframe, lists
 * it, or can build it from one it lists without needing more than
 * `MAX_BASE_RATIO` of its bars per bar.
 */
export function servesTimeframe(adapter: DataAdapter, timeframe: TimeFrame): boolean {
  // Tick bars come from the feed's trades.
  if (tickBarCount(timeframe) !== null) return typeof adapter.fetchTrades === 'function' && typeof adapter.subscribeTrades === 'function';
  const supported = adapter.supportedTimeframes;
  return !supported?.length || baseTimeframe(timeframe, supported) !== null;
}

/**
 * Start of the base bar after the one starting at `time`, on the calendar for
 * weeks and months. A bar of a day or more stamped at `zone`'s midnight
 * (rather than at a date's 00:00 UTC) is followed by the next midnight there,
 * which a day the clocks change moves by an hour.
 */
function nextBaseStart(time: number, base: TimeFrame, zone?: string): number {
  const parsed = parseTimeframe(base);
  const zoned = zone !== undefined && timeframeSpansDays(base) && time % DAY_MS !== 0;
  const wall = zoned ? time + offsetAt(zone, time) * MINUTE_MS : time;
  let next: number;
  if (parsed?.unit === 'M') {
    const d = new Date(wall);
    next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + parsed.count, 1);
  } else {
    next = wall + timeframeToMs(base);
  }
  return zoned ? wallToUtc(next, zone) : next;
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

/** How a target timeframe is built: from which of the feed's, and where its days start. */
interface BuildPlan {
  base: TimeFrame;
  /** The zone whose midnight days start at; UTC's when left out. */
  zone?: string;
  /** How its buckets are found: the zone, and whether the base bars are dates. */
  bucket: BucketOptions;
}

/** The base bars of the newest bucket a history call served, to resume from on connect. */
interface ServedTail {
  symbol: string;
  target: TimeFrame;
  zone?: string;
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
 * - Days, weeks, months and the hour frames that divide a day start at the
 *   midnight of the symbol's exchange: the `timeZone` the feed's
 *   `resolveSymbol` names, asked once and kept per symbol (a feed without
 *   one, one that fails or is slow to answer, or one whose timeframes can't
 *   line up with that midnight, gets UTC's, and keeps them for the symbol).
 *   Daily bars stamped at 00:00 UTC are read as their dates.
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
  readonly fetchTrades?: (symbol: string, limit?: number) => Promise<Trade[]>;
  readonly subscribeTrades?: (symbol: string, onTrades: (trades: Trade[]) => void) => () => void;

  private readonly listeners = new Map<DataAdapterEventType, Set<DataAdapterListener>>();
  private readonly unsubscribe: (() => void)[] = [];
  /** The live subscription: target and how it is built, when the feed doesn't serve it. */
  private live: ({ symbol: string; target: TimeFrame } & BuildPlan) | null = null;
  private bucket: number | null = null;
  /** The forming bucket's base bars, by time. */
  private parts = new Map<number, OHLCBar>();
  private tail: ServedTail | null = null;
  /** Bumped by connect and disconnect: history paging in progress stops. */
  private generation = 0;
  /**
   * Per symbol, the zone its days are built in (null: UTC's), kept from the
   * feed's first answer so history, older pages and live bars always agree.
   * Only the zone: what the feed knows about the symbol is asked again.
   */
  private readonly zones = new Map<string, string | null>();
  /** Per symbol, the feed's answer on its way: the chart's ask and this wrapper's share one request. */
  private readonly resolving = new Map<string, Promise<SymbolInfo | null>>();

  constructor(private readonly inner: DataAdapter, private readonly baseTimeframes: readonly TimeFrame[]) {
    this.name = inner.name;
    if (inner.fetchHistoryBefore) {
      this.fetchHistoryBefore = (symbol, timeframe, before, limit) => this.historyBefore(symbol, timeframe, before, limit);
    }
    if (inner.searchSymbols) this.searchSymbols = inner.searchSymbols.bind(inner);
    if (inner.resolveSymbol) this.resolveSymbol = (symbol) => this.resolveShared(symbol);
    if (inner.subscribeQuotes) this.subscribeQuotes = inner.subscribeQuotes.bind(inner);
    if (inner.fetchNews) this.fetchNews = inner.fetchNews.bind(inner);
    if (inner.fetchTrades) this.fetchTrades = inner.fetchTrades.bind(inner);
    if (inner.subscribeTrades) this.subscribeTrades = inner.subscribeTrades.bind(inner);
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
    // History came first and settled the symbol's zone: live bars follow it.
    this.live = base === config.timeframe
      ? null
      : { symbol: config.symbol, target: config.timeframe, ...this.planFor(config.timeframe, this.keptZone(config.symbol)) };
    if (this.live) this.resumeFromHistory(this.live);
    this.inner.connect({ ...config, timeframe: this.live?.base ?? base });
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
    const utcBase = this.baseFor(timeframe);
    if (utcBase === timeframe) return this.inner.fetchHistory(symbol, timeframe, limit);
    const generation = this.generation;
    const plan = this.planFor(timeframe, this.waitsForZone(timeframe) ? await this.zoneFor(symbol) : this.keptZone(symbol));
    const want = this.baseBarsFor(timeframe, plan.base, limit);
    const first = await this.inner.fetchHistory(symbol, plan.base, Math.min(want, MAX_BASE_BARS_PER_REQUEST));
    const bars = await this.extendBack(symbol, plan.base, first, want, generation);
    this.rememberTail(symbol, timeframe, bars, plan);
    return this.toTarget(bars, timeframe, limit, plan);
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

  // --- The symbol's zone ---

  /** Whether building `timeframe` needs the symbol's zone first: its buckets start at midnight, and the feed can say where. */
  private waitsForZone(timeframe: TimeFrame): boolean {
    return typeof this.inner.resolveSymbol === 'function' && timeframeFollowsDays(timeframe);
  }

  private keptZone(symbol: string): string | undefined {
    return this.zones.get(symbol) ?? undefined;
  }

  /**
   * The zone `symbol`'s days are built in, asking the feed the first time. A
   * feed that hasn't said within `SYMBOL_ZONE_WAIT_MS`, or failed to say,
   * keeps UTC days for the symbol: a later answer can't move bars already
   * built, so older pages and the history of a reconnect never hold a day
   * twice.
   */
  private async zoneFor(symbol: string): Promise<string | undefined> {
    if (this.zones.has(symbol)) return this.keptZone(symbol);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const waited = new Promise<void>((resolve) => { timer = setTimeout(() => resolve(), SYMBOL_ZONE_WAIT_MS); });
    try {
      await Promise.race([this.resolveShared(symbol), waited]);
    } catch {
      // No zone from the feed: the days are UTC's, and stay so below.
    } finally {
      clearTimeout(timer);
    }
    if (!this.zones.has(symbol)) this.zones.set(symbol, null);
    return this.keptZone(symbol);
  }

  /** The feed's answer about `symbol`: one request while it is on its way, whoever asks. */
  private resolveShared(symbol: string): Promise<SymbolInfo | null> {
    const inFlight = this.resolving.get(symbol);
    if (inFlight) return inFlight;
    const resolve = this.inner.resolveSymbol!.bind(this.inner);
    // Taken as a promise: a feed may throw, or answer without one.
    const pending = Promise.resolve().then(() => resolve(symbol));
    this.resolving.set(symbol, pending);
    const settle = () => {
      if (this.resolving.get(symbol) === pending) this.resolving.delete(symbol);
    };
    pending.then((info) => {
      this.keepZone(symbol, info);
      settle();
    }, settle);
    return pending;
  }

  /** The zone `info` names for `symbol`, kept the first time only. */
  private keepZone(symbol: string, info: SymbolInfo | null): void {
    if (this.zones.has(symbol)) return;
    const zone = symbolTimeZone(info);
    this.zones.set(symbol, zone && isValidTimeZone(zone) && !isUtcTimeZone(zone) ? zone : null);
  }

  /**
   * How `timeframe` is built for a symbol in `zone`: from the coarsest base
   * that lines up with the zone's midnight. When none does (a feed of 4h
   * bars for a zone 7 hours from UTC), from today's base on UTC days: the
   * timeframe is still served.
   */
  private planFor(timeframe: TimeFrame, zone: string | undefined): BuildPlan {
    const utcBase = this.baseFor(timeframe);
    // Frames on the epoch floor (7m, 1h) have no midnight to follow: no zone, whenever it is learnt.
    const zoned = zone !== undefined && utcBase !== timeframe && timeframeFollowsDays(timeframe);
    const zonedBase = zoned ? baseTimeframe(timeframe, this.baseTimeframes, zone) : null;
    const base = zonedBase ?? utcBase;
    const planZone = zonedBase ? zone : undefined;
    return { base, zone: planZone, bucket: { timeZone: planZone, dates: timeframeSpansDays(base) } };
  }

  // --- History ---

  private async historyBefore(symbol: string, timeframe: TimeFrame, before: number, limit: number): Promise<OHLCBar[]> {
    const fetchBefore = this.inner.fetchHistoryBefore!.bind(this.inner);
    const utcBase = this.baseFor(timeframe);
    if (utcBase === timeframe) return fetchBefore(symbol, timeframe, before, limit);
    const generation = this.generation;
    const plan = this.planFor(timeframe, this.waitsForZone(timeframe) ? await this.zoneFor(symbol) : this.keptZone(symbol));
    const want = this.baseBarsFor(timeframe, plan.base, limit);
    const first = await fetchBefore(symbol, plan.base, before, Math.min(want, MAX_BASE_BARS_PER_REQUEST));
    const bars = await this.extendBack(symbol, plan.base, first.filter((b) => b.time < before), want, generation, 1);
    return this.toTarget(bars, timeframe, limit, plan);
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
  private toTarget(bars: OHLCBar[], target: TimeFrame, limit: number, plan: BuildPlan): OHLCBar[] {
    if (bars.length === 0) return [];
    const out = resampleBars(bars, target, plan.bucket);
    if (out.length > 1 && out[0].time !== bars[0].time) out.shift();
    return out.length > limit ? out.slice(out.length - limit) : out;
  }

  /** Keep the newest bucket's base bars, for the live stream to resume from. */
  private rememberTail(symbol: string, target: TimeFrame, bars: OHLCBar[], plan: BuildPlan): void {
    if (bars.length === 0) return;
    const bucket = timeframeBucketStart(bars[bars.length - 1].time, target, plan.bucket);
    let i = bars.length;
    while (i > 0 && timeframeBucketStart(bars[i - 1].time, target, plan.bucket) === bucket) i--;
    this.tail = { symbol, target, zone: plan.zone, bucket, bars: bars.slice(i) };
  }

  private resumeFromHistory(live: { symbol: string; target: TimeFrame; zone?: string }): void {
    const tail = this.tail;
    if (!tail || tail.symbol !== live.symbol || tail.target !== live.target || tail.zone !== live.zone) return;
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
    const bucket = timeframeBucketStart(bar.time, live.target, live.bucket);
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
    const next = timeframeBucketStart(nextBaseStart(bar.time, live.base, live.zone), live.target, live.bucket);
    const lastOfBucket = closed && next !== bucket;
    this.emit('bar', { bar: current, closed: lastOfBucket });
    if (lastOfBucket) {
      this.resetBucket();
      // The next bucket starts after this one, never at it again.
      this.bucket = next;
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
