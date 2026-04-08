import type { OHLCBar, DataSeries } from '@chart-lib/commons';
import { mergeBar } from '@chart-lib/commons';

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

/** Sanitize a bar: clamp high/low to envelope OHLC values. */
function sanitizeBar(bar: OHLCBar): OHLCBar {
  return {
    ...bar,
    high: Math.max(bar.open, bar.high, bar.low, bar.close),
    low: Math.min(bar.open, bar.high, bar.low, bar.close),
    volume: bar.volume !== undefined ? Math.max(0, bar.volume) : undefined,
  };
}

export class DataManager {
  private data: DataSeries = [];

  getData(): DataSeries {
    return this.data;
  }

  setData(data: DataSeries): void {
    // Filter out completely invalid bars, sanitize the rest
    this.data = data
      .filter(isValidBar)
      .map(sanitizeBar);
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
