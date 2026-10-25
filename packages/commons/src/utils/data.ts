import type { OHLCBar, DataSeries } from '../types/ohlc.js';

/**
 * Bar times at or above this are milliseconds (from March 1973 on), below it
 * seconds (up to the year 5138).
 */
export const MS_TIME_THRESHOLD = 1e11;

/** Milliseconds in one unit of a series' bar times: 1 for milliseconds, 1000 for seconds. */
export type BarTimeUnit = 1 | 1000;

/**
 * The unit of a series' bar times, decided once from its newest bar, so its
 * old bars keep the series' unit: a millisecond bar from 2000 is below 1e12
 * and would pass for seconds on its own. Milliseconds when there are no bars.
 */
export function barTimeUnit(data: ArrayLike<{ time: number }>): BarTimeUnit {
  const last = data.length > 0 ? data[data.length - 1].time : NaN;
  if (!Number.isFinite(last)) return 1;
  return Math.abs(last) >= MS_TIME_THRESHOLD ? 1 : 1000;
}

/**
 * Normalize bar timestamp to milliseconds. Pass the series' unit
 * (`barTimeUnit(data)`) when there is one; on its own a time is taken as
 * milliseconds from `MS_TIME_THRESHOLD` (1973) up, seconds below.
 */
export function normalizeBarTime(time: number, unit?: BarTimeUnit): number {
  if (unit !== undefined) return time * unit;
  return Math.abs(time) >= MS_TIME_THRESHOLD ? time : time * 1000;
}

/**
 * Normalize a bar's timestamp field to milliseconds.
 * Accepts either { time } (ms or s) or { t, o, h, l, c, v } wire format.
 */
export function normalizeBar(raw: Record<string, number>): OHLCBar {
  const time = normalizeBarTime(raw.time ?? raw.t ?? 0);
  return {
    time,
    open: raw.open ?? raw.o ?? 0,
    high: raw.high ?? raw.h ?? 0,
    low: raw.low ?? raw.l ?? 0,
    close: raw.close ?? raw.c ?? 0,
    volume: raw.volume ?? raw.v ?? 0,
  };
}

export function sliceVisibleData(
  data: DataSeries,
  from: number,
  to: number,
): DataSeries {
  const startIdx = Math.max(0, from);
  const endIdx = Math.min(data.length, to + 1);
  return data.slice(startIdx, endIdx);
}

export function findBarIndex(data: DataSeries, timestamp: number): number {
  let lo = 0;
  let hi = data.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (data[mid].time < timestamp) lo = mid + 1;
    else if (data[mid].time > timestamp) hi = mid - 1;
    else return mid;
  }
  return lo;
}

/**
 * `min`..`max` with room above and below: `padding` of the span on each side,
 * or on a log scale the same share of its log span, so the range stays above
 * zero and the room looks the same top and bottom.
 */
export function padPriceRange(min: number, max: number, padding: number, log = false): { min: number; max: number } {
  const logSpan = log && min > 0 && max > 0 ? Math.log(max / min) : Number.NaN;
  if (Number.isFinite(logSpan)) {
    const span = logSpan || Math.log(1 + 2 * padding);
    const factor = Math.exp(span * padding);
    return { min: min / factor, max: max * factor };
  }
  const range = max - min || 1;
  return { min: min - range * padding, max: max + range * padding };
}

/** Room above and below the prices on a scale, as shares of its height (0.1: a tenth). */
export interface ScaleMargins {
  top: number;
  bottom: number;
}

/**
 * The range that shows `min`..`max` with `margins` of the scale's height
 * above and below them; on a log scale, shares of its log span. A flat price
 * gets a span of 1 (a hundredth of itself on a log scale) to sit in.
 */
export function fitPriceRange(min: number, max: number, margins: ScaleMargins, log = false): { min: number; max: number } {
  const share = Math.max(1 - margins.top - margins.bottom, Number.EPSILON);
  const logSpan = log && min > 0 && max > 0 ? Math.log(max / min) : Number.NaN;
  if (Number.isFinite(logSpan)) {
    const total = (logSpan || Math.log(1.01)) / share;
    return { min: min / Math.exp(total * margins.bottom), max: max * Math.exp(total * margins.top) };
  }
  const total = (max - min || 1) / share;
  return { min: min - total * margins.bottom, max: max + total * margins.top };
}

export function computePriceRange(
  data: DataSeries,
  from: number,
  to: number,
  padding = 0.05,
  /** Pad as a log scale shows it (`padPriceRange`). */
  log = false,
): { min: number; max: number } {
  if (data.length === 0) return { min: 0, max: 1 };
  const startIdx = Math.max(0, from);
  const endIdx = Math.min(data.length - 1, to);
  let min = Infinity;
  let max = -Infinity;
  for (let i = startIdx; i <= endIdx; i++) {
    if (data[i].low < min) min = data[i].low;
    if (data[i].high > max) max = data[i].high;
  }
  if (min === Infinity) return { min: 0, max: 1 };
  return padPriceRange(min, max, padding, log);
}

/**
 * A trade into the bar it falls in: its high, low, close and volume. The bar
 * keeps its own time, where its interval opens; a trade later in it moving
 * the time made the next update for that bar look older than the bar.
 */
export function mergeBar(existing: OHLCBar, tick: { price: number; volume?: number; time: number }): OHLCBar {
  return {
    ...existing,
    high: Math.max(existing.high, tick.price),
    low: Math.min(existing.low, tick.price),
    close: tick.price,
    volume: existing.volume + (tick.volume ?? 0),
  };
}
