import type { OHLCBar, TimeFrame, RawTick, AggregatedBar, BucketOptions } from '@tradecanvas/commons';
import { offsetAt, parseTimeframe, timeframeBucketStart, timeframeToMs } from '@tradecanvas/commons';
import { Emitter } from './Emitter.js';

const MINUTE_MS = 60_000;

/** Whether bars of `tf` are a day long or more, which some feeds stamp by date. */
function isDateFrame(tf: TimeFrame): boolean {
  const unit = parseTimeframe(tf)?.unit;
  return unit === 'd' || unit === 'w' || unit === 'M';
}

interface AggregatorEvents {
  /** The forming bar, after each tick. */
  bar: AggregatedBar;
  /** A bar whose interval is over. */
  barClose: AggregatedBar;
  [key: string]: unknown;
}

/**
 * Aggregates raw ticks into OHLCV bars aligned to timeframe boundaries.
 *
 * Handles:
 * - Tick-to-bar conversion with proper timeframe alignment
 * - Bar close detection (when time crosses boundary)
 * - Volume accumulation
 * - Tick counting
 *
 * Note: Emitted bars are references to internal state.
 * Listeners MUST NOT mutate them — treat as readonly.
 */
export class TickAggregator extends Emitter<AggregatorEvents> {
  private currentBar: AggregatedBar | null = null;
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
    this.dateFrame = isDateFrame(_timeframe);
    this.ringCapacity = bufferSize;
    this.tickRing = new Array<RawTick>(bufferSize);
  }

  setTimeframe(tf: TimeFrame): void {
    this.timeframe = tf;
    this.timeframeMs = timeframeToMs(tf);
    this.dateFrame = isDateFrame(tf);
    this.currentBar = null;
    this.ringHead = 0;
    this.ringCount = 0;
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
   * Detects close by checking if this bar's time differs from current.
   */
  processBar(bar: OHLCBar, closed: boolean): void {
    if (closed && this.currentBar && this.currentBar.time === bar.time) {
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
    this.ringHead = 0;
    this.ringCount = 0;
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
