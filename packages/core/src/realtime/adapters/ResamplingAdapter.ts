import type {
  ConnectionState,
  DataAdapter,
  DataAdapterConfig,
  DataAdapterEvent,
  DataAdapterEventType,
  DataAdapterListener,
  OHLCBar,
  TimeFrame,
} from '@tradecanvas/commons';
import { pickBaseTimeframe, resampleBars, timeframeBucketStart, timeframeToMs } from '@tradecanvas/commons';

/** Most base bars asked for in one request (Binance and Bybit stop at 1000). */
const MAX_BASE_REQUEST = 1000;

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

/** Merge `bar` into `into` (same bucket): extremes, last close, summed volume. */
function merge(into: OHLCBar | null, bar: OHLCBar, time: number): OHLCBar {
  if (!into) return { ...bar, time };
  return {
    time,
    open: into.open,
    high: Math.max(into.high, bar.high),
    low: Math.min(into.low, bar.low),
    close: bar.close,
    volume: into.volume + bar.volume,
  };
}

/**
 * Serves timeframes a feed lacks by building them from one it has: 7m from
 * 1m, 90m from 30m, a quarter from months. History is fetched in the base
 * timeframe (paging back through `fetchHistoryBefore` when one request holds
 * too few bars) and merged per bucket; live base bars are merged into the
 * forming bucket, which closes with its last base bar. Timeframes the feed
 * has pass straight through.
 */
export class ResamplingAdapter implements DataAdapter {
  readonly name: string;
  readonly fetchHistoryBefore?: (symbol: string, timeframe: TimeFrame, before: number, limit: number) => Promise<OHLCBar[]>;

  private readonly listeners = new Map<DataAdapterEventType, Set<DataAdapterListener>>();
  private readonly unsubscribe: (() => void)[] = [];
  /** The timeframe asked for, and the one subscribed to when they differ. */
  private target: TimeFrame | null = null;
  private base: TimeFrame | null = null;
  private bucket: number | null = null;
  /** Closed base bars of the current bucket, merged. */
  private closedPart: OHLCBar | null = null;
  /** The base bar still forming in the current bucket. */
  private forming: OHLCBar | null = null;

  constructor(private readonly inner: DataAdapter, private readonly baseTimeframes: readonly TimeFrame[]) {
    this.name = inner.name;
    if (inner.fetchHistoryBefore) {
      this.fetchHistoryBefore = (symbol, timeframe, before, limit) => this.historyBefore(symbol, timeframe, before, limit);
    }
    this.listen('bar', (e) => this.onBar(e));
    for (const type of FORWARDED) this.listen(type, (e) => this.emit(type, e.data));
  }

  /** The timeframe to fetch for `timeframe`: itself when served, else the closest one that builds it. */
  baseFor(timeframe: TimeFrame): TimeFrame {
    if (this.baseTimeframes.includes(timeframe)) return timeframe;
    return pickBaseTimeframe(timeframe, this.baseTimeframes) ?? timeframe;
  }

  connect(config: DataAdapterConfig): void {
    const base = this.baseFor(config.timeframe);
    this.resetBucket();
    this.target = base === config.timeframe ? null : config.timeframe;
    this.base = base;
    this.inner.connect({ ...config, timeframe: base });
  }

  disconnect(): void {
    this.inner.disconnect();
    this.resetBucket();
    this.target = null;
  }

  getConnectionState(): ConnectionState {
    return this.inner.getConnectionState();
  }

  async fetchHistory(symbol: string, timeframe: TimeFrame, limit = 500): Promise<OHLCBar[]> {
    const base = this.baseFor(timeframe);
    if (base === timeframe) return this.inner.fetchHistory(symbol, timeframe, limit);
    const want = this.baseBarsFor(timeframe, base, limit);
    const first = await this.inner.fetchHistory(symbol, base, Math.min(want, MAX_BASE_REQUEST));
    const bars = await this.extendBack(symbol, base, first, want);
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
    const want = this.baseBarsFor(timeframe, base, limit);
    const first = await fetchBefore(symbol, base, before, Math.min(want, MAX_BASE_REQUEST));
    const bars = await this.extendBack(symbol, base, first.filter((b) => b.time < before), want);
    return this.toTarget(bars, timeframe, limit);
  }

  /** Base bars for `limit` target bars, plus one bucket for a partial first one. */
  private baseBarsFor(target: TimeFrame, base: TimeFrame, limit: number): number {
    return (limit + 1) * Math.ceil(timeframeToMs(target) / timeframeToMs(base));
  }

  /** Page back until `want` base bars are in, the history starts, or the feed stops going back. */
  private async extendBack(symbol: string, base: TimeFrame, bars: OHLCBar[], want: number): Promise<OHLCBar[]> {
    const fetchBefore = this.inner.fetchHistoryBefore?.bind(this.inner);
    let out = bars;
    while (fetchBefore && out.length > 0 && out.length < want) {
      const oldest = out[0].time;
      const page = await fetchBefore(symbol, base, oldest, Math.min(want - out.length, MAX_BASE_REQUEST));
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

  // --- Live bars ---

  private onBar(event: DataAdapterEvent): void {
    const target = this.target;
    if (!target) {
      this.emit('bar', event.data);
      return;
    }
    const { bar, closed } = event.data as { bar: OHLCBar; closed: boolean };
    const bucket = timeframeBucketStart(bar.time, target);
    if (this.bucket !== null && bucket !== this.bucket) {
      // A bar of the next bucket: the current one is complete.
      const done = this.composed();
      if (done) this.emit('bar', { bar: done, closed: true });
      this.resetBucket();
    }
    this.bucket = bucket;
    if (closed) {
      this.closedPart = merge(this.closedPart, bar, bucket);
      this.forming = null;
    } else {
      this.forming = bar;
    }

    const current = this.composed();
    if (!current) return;
    const baseMs = this.base ? timeframeToMs(this.base) : 0;
    const lastOfBucket = closed && timeframeBucketStart(bar.time + baseMs, target) !== bucket;
    this.emit('bar', { bar: current, closed: lastOfBucket });
    if (lastOfBucket) this.resetBucket();
  }

  /** The current bucket: its closed base bars plus the forming one. */
  private composed(): OHLCBar | null {
    if (this.bucket === null) return null;
    if (!this.forming) return this.closedPart;
    return merge(this.closedPart, this.forming, this.bucket);
  }

  private resetBucket(): void {
    this.bucket = null;
    this.closedPart = null;
    this.forming = null;
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
