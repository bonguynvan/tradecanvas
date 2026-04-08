import type { OHLCBar, TimeFrame, RawTick, AggregatedBar } from '@chart-lib/commons';
import { timeframeToMs } from '@chart-lib/commons';
import { Emitter } from './Emitter.js';

interface AggregatorEvents {
  bar: AggregatedBar;       // bar updated (forming)
  barClose: AggregatedBar;  // bar closed (finalized)
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
  private timeframeMs: number;

  // Ring buffer for tick storage — O(1) push and eviction
  private tickRing: RawTick[];
  private ringHead = 0;
  private ringCount = 0;
  private readonly ringCapacity: number;

  constructor(
    private timeframe: TimeFrame,
    bufferSize = 1000,
  ) {
    super();
    this.timeframeMs = timeframeToMs(timeframe);
    this.ringCapacity = bufferSize;
    this.tickRing = new Array<RawTick>(bufferSize);
  }

  setTimeframe(tf: TimeFrame): void {
    this.timeframe = tf;
    this.timeframeMs = timeframeToMs(tf);
    this.currentBar = null;
    this.ringHead = 0;
    this.ringCount = 0;
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
    return Math.floor(timestamp / this.timeframeMs) * this.timeframeMs;
  }
}
