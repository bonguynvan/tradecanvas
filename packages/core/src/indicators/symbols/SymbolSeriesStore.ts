import type { DataSeries } from '@tradecanvas/commons';
import { normalizeBarTime } from '@tradecanvas/commons';

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
    const sorted = [...bars].sort((a, b) => normalizeBarTime(a.time) - normalizeBarTime(b.time));
    const times = sorted.map((b) => normalizeBarTime(b.time));
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
   * doesn't have.
   */
  closeAt(symbol: string, time: number): number | undefined {
    const entry = this.series.get(symbol);
    if (!entry) return undefined;
    const t = normalizeBarTime(time);
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
}
