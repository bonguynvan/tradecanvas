import type { OHLCBar, TimeFrame, RawTick, AggregatedBar, BucketOptions } from '@tradecanvas/commons';
import { normalizeBarTime, offsetAt, timeframeBucketStart, timeframeSpansDays, timeframeToMs } from '@tradecanvas/commons';
import { Emitter } from './Emitter.js';

const MINUTE_MS = 60_000;

interface AggregatorEvents {
  /** The forming bar, after each tick. */
  bar: AggregatedBar;
  /** A bar whose interval is over. */
  barClose: AggregatedBar;
  /** A closed bar older than the newest: the feed's last word on a bar already past (a late final, a revision). */
  correction: OHLCBar;
  [key: string]: unknown;
}

/** Whether a bar's prices are all numbers, for trades to go on building it. */
const pricesAreNumbers = (b: OHLCBar): boolean => [b.open, b.high, b.low, b.close].every(Number.isFinite);

/**
 * Aggregates raw ticks into OHLCV bars aligned to timeframe boundaries.
 *
 * Handles:
 * - Tick-to-bar conversion with proper timeframe alignment
 * - Bar close detection (when time crosses boundary)
 * - Volume accumulation
 * - Tick counting
 * - Bars older than the newest one: a closed one is a correction, sent as
 *   `correction`; a forming frame, or a trade, for one is left out, so it
 *   can neither close the forming bar early nor move the price
 *
 * Note: Emitted bars are references to internal state.
 * Listeners MUST NOT mutate them — treat as readonly.
 */
export class TickAggregator extends Emitter<AggregatorEvents> {
  private currentBar: AggregatedBar | null = null;
  /**
   * When the newest bar seen starts, ms (`seed`, the bars and the trades
   * since): an older bar is past. Times are read by their size, so a history
   * in seconds lines up with a stream in milliseconds.
   */
  private newest = -Infinity;
  /**
   * Whether trades build the forming bar (`processTick`, `resume`), on the
   * buckets, rather than the feed sending it formed (`processBar`).
   */
  private builtFromTrades = false;
  private timeframe: TimeFrame;
  private timeframeMs: number;
  /** Bars a day long or more, which `dateStamps` stamps by date. */
  private dateFrame: boolean;
  /** Where the buckets start: see `setTimeZone`. */
  private bucket: BucketOptions = {};
  private dateStamps = false;

  // Ring buffer for tick storage — O(1) push and eviction
  private tickRing: RawTick[];
  private ringHead = 0;
  private ringCount = 0;
  private readonly ringCapacity: number;

  constructor(
    _timeframe: TimeFrame,
    bufferSize = 1000,
  ) {
    super();
    this.timeframe = _timeframe;
    this.timeframeMs = timeframeToMs(_timeframe);
    this.dateFrame = timeframeSpansDays(_timeframe);
    this.ringCapacity = bufferSize;
    this.tickRing = new Array<RawTick>(bufferSize);
  }

  setTimeframe(tf: TimeFrame): void {
    this.timeframe = tf;
    this.timeframeMs = timeframeToMs(tf);
    this.dateFrame = timeframeSpansDays(tf);
    this.reset();
  }

  /**
   * When the newest bar a stream's history holds starts (its last bar), or
   * `-Infinity` for none: a bar older than it is a correction or left out,
   * as one older than the bars and trades since. It doesn't move the newest
   * back: after a reconnect whose history ends on an earlier bar than the
   * trades since, those still count. Unless the trades built that bar on
   * buckets they no longer start on (the exchange's zone came after them,
   * or the history's bars start at its midnight): the next trades can't go
   * on building it, and they would be left out as late until the next
   * bucket, so the bar is let go and the history's last is the newest.
   * `reset()` starts again.
   */
  seed(time: number): void {
    if (this.builtOffTheBuckets()) {
      this.currentBar = null;
      this.newest = -Infinity;
    }
    if (Number.isFinite(time)) this.newest = Math.max(this.newest, normalizeBarTime(time));
  }

  /**
   * The history's last bar, still forming: the next trades go on building
   * it, its open, high, low and volume kept, rather than starting it again
   * from the first one. A bar older than the newest is left out, so the bar
   * the trades were building when a reconnect's history ends earlier stays;
   * the same bar again replaces it, the history's having the trades missed
   * while away. A bar whose prices aren't numbers is left out.
   */
  resume(bar: OHLCBar): void {
    if (!pricesAreNumbers(bar)) return;
    const time = normalizeBarTime(bar.time);
    if (time < this.newest) return;
    this.newest = time;
    this.currentBar = {
      time, open: bar.open, high: bar.high, low: bar.low, close: bar.close,
      volume: bar.volume ?? 0, closed: false, tickCount: 0,
    };
    this.builtFromTrades = true;
  }

  /**
   * The exchange's zone: days, weeks, months and the hour frames that divide
   * a day start at its midnight (`timeframeBucketStart`), UTC's when left
   * out. `dateStamps` stamps days, weeks and months at 00:00 UTC of their
   * date there instead, as feeds that stamp their daily bars by date do, so
   * a bar from ticks lands on the feed's own bar.
   */
  setTimeZone(timeZone?: string | number | null, dateStamps = false): void {
    this.bucket = { timeZone: timeZone ?? undefined };
    this.dateStamps = dateStamps;
  }

  processTick(tick: RawTick): void {
    // Ring buffer push — O(1)
    const writeIdx = (this.ringHead + this.ringCount) % this.ringCapacity;
    this.tickRing[writeIdx] = tick;
    if (this.ringCount < this.ringCapacity) {
      this.ringCount++;
    } else {
      // Buffer full — advance head, dropping oldest tick
      this.ringHead = (this.ringHead + 1) % this.ringCapacity;
    }

    const barTime = this.alignToTimeframe(tick.time);
    // A trade for a bar already past, delivered late: the bar it belongs to
    // is no longer built here, and starting it again would close the forming one.
    const at = normalizeBarTime(barTime);
    if (at < this.newest) return;
    this.newest = at;

    if (!this.currentBar || this.currentBar.time !== barTime) {
      // Close previous bar
      if (this.currentBar) {
        this.currentBar.closed = true;
        this.emit('barClose', this.currentBar);
      }

      // Start new bar
      this.currentBar = {
        time: barTime,
        open: tick.price,
        high: tick.price,
        low: tick.price,
        close: tick.price,
        volume: tick.volume,
        closed: false,
        tickCount: 1,
      };
      this.builtFromTrades = true;
    } else {
      // Update current bar
      this.currentBar.high = Math.max(this.currentBar.high, tick.price);
      this.currentBar.low = Math.min(this.currentBar.low, tick.price);
      this.currentBar.close = tick.price;
      this.currentBar.volume += tick.volume;
      this.currentBar.tickCount++;
    }

    this.emit('bar', this.currentBar);
  }

  /**
   * Process a pre-formed bar (from adapter that already provides OHLCV).
   * Detects close by checking if this bar's time differs from current. A bar
   * older than the newest is past: closed, it is sent as `correction`, the
   * forming bar left as it is; forming, it is a stale frame, left out.
   */
  processBar(bar: OHLCBar, closed: boolean): void {
    const at = normalizeBarTime(bar.time);
    if (at < this.newest) {
      if (closed) this.emit('correction', { ...bar });
      return;
    }
    this.newest = at;
    this.builtFromTrades = false;
    if (closed && this.currentBar && normalizeBarTime(this.currentBar.time) === at) {
      // Close the bar
      this.currentBar = { ...bar, closed: true, tickCount: this.currentBar.tickCount + 1 };
      this.emit('barClose', this.currentBar);
      this.currentBar = null;
    } else if (!closed) {
      // Update forming bar
      this.currentBar = { ...bar, closed: false, tickCount: (this.currentBar?.tickCount ?? 0) + 1 };
      this.emit('bar', this.currentBar);
    } else {
      // New closed bar without a forming bar preceding it
      const aggBar: AggregatedBar = { ...bar, closed: true, tickCount: 1 };
      this.emit('barClose', aggBar);
      this.currentBar = null;
    }
  }

  getCurrentBar(): AggregatedBar | null {
    return this.currentBar ? { ...this.currentBar } : null;
  }

  getTickBuffer(): readonly RawTick[] {
    // Materialize ring into ordered array for external consumers
    const result: RawTick[] = new Array(this.ringCount);
    for (let i = 0; i < this.ringCount; i++) {
      result[i] = this.tickRing[(this.ringHead + i) % this.ringCapacity];
    }
    return result;
  }

  reset(): void {
    this.currentBar = null;
    this.newest = -Infinity;
    this.builtFromTrades = false;
    this.ringHead = 0;
    this.ringCount = 0;
  }

  /** Whether the trades built the forming bar on buckets other than the ones they start on now. */
  private builtOffTheBuckets(): boolean {
    const bar = this.currentBar;
    return bar !== null && this.builtFromTrades && !this.startsABucket(normalizeBarTime(bar.time));
  }

  /** Whether a bar at `time` is one the trades start now. */
  private startsABucket(time: number): boolean {
    if (!(this.timeframeMs > 0)) return true;
    // A date stamp is 00:00 UTC of its date, in any zone: the dates' own buckets.
    if (this.dateStamps && this.dateFrame) return timeframeBucketStart(time, this.timeframe) === time;
    return this.alignToTimeframe(time) === time;
  }

  private alignToTimeframe(timestamp: number): number {
    // A timeframe without a length (ticks): each tick keeps its own time.
    if (!(this.timeframeMs > 0)) return timestamp;
    const start = timeframeBucketStart(timestamp, this.timeframe, this.bucket);
    if (!this.dateStamps || !this.dateFrame) return start;
    // The bucket starts at the zone's midnight: its date there, at 00:00 UTC.
    return start + offsetAt(this.bucket.timeZone ?? 0, start) * MINUTE_MS;
  }
}
