import type { DataSeries } from '@tradecanvas/commons';
import { barTimeUnit, normalizeBarTime, type BarTimeUnit } from '@tradecanvas/commons';

interface Entry {
  bars: DataSeries;
  /** Bar times in ms, ascending. */
  times: number[];
  /** How far past its last bar the series still speaks: its last spacing. */
  end: number;
}

/**
 * Other symbols' bars, for indicators that compare with them (a symbol
 * drawn on the chart, a spread). Looked up by time, so the other series
 * lines up with the chart's bars even when their sessions differ.
 */
export class SymbolSeriesStore {
  private series = new Map<string, Entry>();

  /** `symbol`'s bars (null forgets them). */
  set(symbol: string, bars: DataSeries | null): void {
    if (!bars || bars.length === 0) {
      this.series.delete(symbol);
      return;
    }
    // One series, one unit: sort as they are, then read the unit off the newest.
    const sorted = [...bars].sort((a, b) => a.time - b.time);
    const unit = barTimeUnit(sorted);
    const times = sorted.map((b) => b.time * unit);
    const last = times[times.length - 1];
    const spacing = times.length > 1 ? last - times[times.length - 2] : 0;
    this.series.set(symbol, { bars: sorted, times, end: last + spacing });
  }

  has(symbol: string): boolean {
    return this.series.has(symbol);
  }

  get(symbol: string): DataSeries | undefined {
    return this.series.get(symbol)?.bars;
  }

  symbols(): string[] {
    return [...this.series.keys()];
  }

  /**
   * `symbol`'s close as of `time`: its last bar at or before it. Undefined
   * before the series starts, past its last bar's span, or for a symbol it
   * doesn't have. `unit` is that of the series `time` comes from
   * (`barTimeUnit`).
   */
  closeAt(symbol: string, time: number, unit?: BarTimeUnit): number | undefined {
    const entry = this.series.get(symbol);
    if (!entry) return undefined;
    const t = normalizeBarTime(time, unit);
    const { times, bars } = entry;
    if (t < times[0]) return undefined;
    const last = times.length - 1;
    if (t > times[last] && (entry.end <= times[last] || t >= entry.end)) return undefined;
    let lo = 0;
    let hi = last;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (times[mid] <= t) lo = mid;
      else hi = mid - 1;
    }
    return bars[lo].close;
  }

  /**
   * `symbol`'s close as of `time`, however long after its last bar: then its
   * last close, marked `stale`. A series fetched once is still read after
   * the chart's own bars have moved on. Undefined before the series starts,
   * or for a symbol it doesn't have.
   */
  lastCloseAt(symbol: string, time: number, unit?: BarTimeUnit): { close: number; stale: boolean } | undefined {
    const close = this.closeAt(symbol, time, unit);
    if (close !== undefined) return { close, stale: false };
    const entry = this.series.get(symbol);
    if (!entry || normalizeBarTime(time, unit) < entry.times[0]) return undefined;
    return { close: entry.bars[entry.bars.length - 1].close, stale: true };
  }
}
