import type { OHLCBar, DataSeries } from '@tradecanvas/commons';
import { mergeBar } from '@tradecanvas/commons';

/** Validate a single OHLC bar. Returns true if bar is usable. */
function isValidBar(bar: OHLCBar): boolean {
  if (!bar || typeof bar.time !== 'number') return false;
  const { open, high, low, close } = bar;
  // Reject NaN / Infinity
  if (!isFinite(open) || !isFinite(high) || !isFinite(low) || !isFinite(close)) return false;
  // Reject negative prices
  if (open < 0 || high < 0 || low < 0 || close < 0) return false;
  // High must be >= low
  if (high < low) return false;
  // Volume (optional) must be non-negative if present
  if (bar.volume !== undefined && (!isFinite(bar.volume) || bar.volume < 0)) return false;
  return true;
}

/** Whether a valid bar already satisfies everything `sanitizeBar` enforces. */
function isSanitized(bar: OHLCBar): boolean {
  return bar.volume !== undefined
    && bar.high >= bar.open && bar.high >= bar.close
    && bar.low <= bar.open && bar.low <= bar.close;
}

/** Sanitize a bar: clamp high/low to envelope OHLC values. */
function sanitizeBar(bar: OHLCBar): OHLCBar {
  return {
    ...bar,
    high: Math.max(bar.open, bar.high, bar.low, bar.close),
    low: Math.min(bar.open, bar.high, bar.low, bar.close),
    volume: bar.volume !== undefined ? Math.max(0, bar.volume) : 0,
  };
}

export class DataManager {
  private data: DataSeries = [];

  getData(): DataSeries {
    return this.data;
  }

  setData(data: DataSeries): void {
    // Drop invalid bars and sanitize the rest in one pass. Bars that are
    // already well-formed (the norm for exchange data) are kept as-is rather
    // than copied — bar objects are never mutated here, only replaced, so
    // sharing them with the caller is safe, and it saves allocating a fresh
    // object per bar on every symbol/timeframe switch.
    const out: OHLCBar[] = [];
    for (let i = 0; i < data.length; i++) {
      const bar = data[i];
      if (!isValidBar(bar)) continue;
      out.push(isSanitized(bar) ? bar : sanitizeBar(bar));
    }
    this.data = out;
  }

  /**
   * Add older bars in front: those before the first loaded bar, in time
   * order, one per time, repaired like `setData`. Returns how many were added.
   */
  prependBars(bars: readonly OHLCBar[]): number {
    const first = this.data.length > 0 ? this.data[0].time : Infinity;
    const older: OHLCBar[] = [];
    for (let i = 0; i < bars.length; i++) {
      const bar = bars[i];
      if (!isValidBar(bar) || bar.time >= first) continue;
      older.push(isSanitized(bar) ? bar : sanitizeBar(bar));
    }
    if (older.length === 0) return 0;
    older.sort((a, b) => a.time - b.time);
    let kept = 0;
    for (let i = 0; i < older.length; i++) {
      if (kept > 0 && older[kept - 1].time === older[i].time) continue;
      older[kept++] = older[i];
    }
    older.length = kept;
    this.data = older.concat(this.data);
    return kept;
  }

  appendBar(bar: OHLCBar): void {
    if (!isValidBar(bar)) return;
    this.data.push(sanitizeBar(bar));
  }

  updateLastBar(bar: OHLCBar): void {
    if (!isValidBar(bar)) return;
    const sanitized = sanitizeBar(bar);
    if (this.data.length === 0) {
      this.data.push(sanitized);
      return;
    }
    this.data[this.data.length - 1] = sanitized;
  }

  updateLastBarFromTick(tick: { price: number; volume?: number; time: number }): void {
    if (this.data.length === 0) return;
    if (!isFinite(tick.price) || tick.price < 0) return;
    if (tick.volume !== undefined && (!isFinite(tick.volume) || tick.volume < 0)) return;
    this.data[this.data.length - 1] = mergeBar(this.data[this.data.length - 1], tick);
  }

  getLength(): number {
    return this.data.length;
  }

  clear(): void {
    this.data = [];
  }
}
