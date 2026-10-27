import type { OHLCBar, DataSeries } from '@tradecanvas/commons';
import { barTimeUnit, mergeBar, normalizeBarTime } from '@tradecanvas/commons';

/** Whether a bar is one the chart takes: its time and prices numbers, none below zero, its high not under its low, its volume (if any) not below zero. */
export function isValidBar(bar: OHLCBar): boolean {
  if (!bar || typeof bar.time !== 'number' || !Number.isFinite(bar.time)) return false;
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

/** Sanitize a bar: clamp high/low to envelope OHLC values, a missing volume 0. */
export function sanitizeBar(bar: OHLCBar): OHLCBar {
  return {
    ...bar,
    high: Math.max(bar.open, bar.high, bar.low, bar.close),
    low: Math.min(bar.open, bar.high, bar.low, bar.close),
    volume: bar.volume !== undefined ? Math.max(0, bar.volume) : 0,
  };
}

/** Whether two bars have the same time, prices and volume. */
export function sameBar(a: OHLCBar, b: OHLCBar): boolean {
  return a === b || (a.time === b.time && a.open === b.open && a.high === b.high && a.low === b.low && a.close === b.close && a.volume === b.volume);
}

/**
 * The index of the bar at `time` in `series` (in its unit), looking back from
 * the newest: corrections are to recent bars, so this costs their distance
 * from the end. -1 when no bar has that time.
 */
export function lastIndexOfTime(series: readonly { time: number }[], time: number): number {
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].time === time) return i;
    if (series[i].time < time) return -1;
  }
  return -1;
}

/** What `DataManager.replaceBar` did: the bar's index (-1: not loaded, or a bar it can't take), and whether its values changed. */
export interface BarReplacement {
  readonly index: number;
  readonly changed: boolean;
}

const NOT_LOADED: BarReplacement = { index: -1, changed: false };

/**
 * `time` in the unit of `series`. A series has one unit, read off its newest
 * bar; a bar or tick arriving in the other (a stream in milliseconds on a
 * series in seconds) is converted, or the series would read as that unit and
 * date every other bar wrong. A time on its own tells its unit by its size
 * (milliseconds from 1973 on).
 */
export function timeInUnitOf(series: readonly { time: number }[], time: number): number {
  if (series.length === 0) return time;
  const ms = normalizeBarTime(time);
  return barTimeUnit(series) === 1 ? ms : ms / 1000;
}

/** A bar or tick with its time in the unit of `series`: itself when it is already. */
export function withTimeOf<T extends { time: number }>(series: readonly { time: number }[], item: T): T {
  const time = timeInUnitOf(series, item.time);
  return time === item.time ? item : { ...item, time };
}

export class DataManager {
  private data: DataSeries = [];

  private withSeriesTime<T extends { time: number }>(item: T): T {
    return withTimeOf(this.data, item);
  }

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
      if (!isValidBar(bars[i])) continue;
      const bar = this.withSeriesTime(bars[i]);
      if (bar.time >= first) continue;
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
    this.data.push(sanitizeBar(this.withSeriesTime(bar)));
  }

  updateLastBar(bar: OHLCBar): void {
    if (!isValidBar(bar)) return;
    const sanitized = sanitizeBar(this.withSeriesTime(bar));
    if (this.data.length === 0) {
      this.data.push(sanitized);
      return;
    }
    this.data[this.data.length - 1] = sanitized;
  }

  /**
   * The loaded bar with the same time, given new values, repaired as
   * `setData` repairs a bar. A bar that, repaired, is the one loaded is
   * not written (`changed: false`): a feed sending its closed bars again,
   * without volume or with a high under its close, costs nothing.
   */
  replaceBar(bar: OHLCBar): BarReplacement {
    if (!isValidBar(bar)) return NOT_LOADED;
    const timed = this.withSeriesTime(bar);
    const index = lastIndexOfTime(this.data, timed.time);
    if (index < 0) return NOT_LOADED;
    const repaired = sanitizeBar(timed);
    if (sameBar(this.data[index], repaired)) return { index, changed: false };
    this.data[index] = repaired;
    return { index, changed: true };
  }

  updateLastBarFromTick(tick: { price: number; volume?: number; time: number }): void {
    if (this.data.length === 0) return;
    if (!isFinite(tick.price) || tick.price < 0) return;
    if (tick.volume !== undefined && (!isFinite(tick.volume) || tick.volume < 0)) return;
    this.data[this.data.length - 1] = mergeBar(this.data[this.data.length - 1], this.withSeriesTime(tick));
  }

  getLength(): number {
    return this.data.length;
  }

  clear(): void {
    this.data = [];
  }
}
