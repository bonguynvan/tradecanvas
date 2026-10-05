import type { DataSeries, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorValueMap } from './IndicatorValueMap.js';

/** A per-bar number, undefined where there is none yet. */
export type Num = number | undefined;

/** An indicator output from per-bar points (null: no value at that bar). */
export function outputOf(data: DataSeries, points: (IndicatorValue | null)[]): IndicatorOutput {
  const values = new IndicatorValueMap();
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    if (point) values.set(data[i].time, point);
  }
  return { values, series: points };
}

/** The closes of `data`, the input most indicators read. */
export function closes(data: DataSeries): number[] {
  return data.map((bar) => bar.close);
}

/** Simple moving average over `period` values in a row (a gap restarts it). */
export function smaOf(src: readonly Num[], period: number): Num[] {
  const out: Num[] = new Array(src.length).fill(undefined);
  let sum = 0;
  let run = 0;
  for (let i = 0; i < src.length; i++) {
    const v = src[i];
    if (v === undefined) { sum = 0; run = 0; continue; }
    sum += v;
    run++;
    if (run > period) sum -= src[i - period]!;
    if (run >= period) out[i] = sum / period;
  }
  return out;
}

/**
 * A smoothing that starts as the simple average of the first `period` values
 * and then moves `alpha` of the way to each new one. Leading gaps are
 * skipped; a later gap keeps the last value and yields no point there.
 */
function smoothOf(src: readonly Num[], period: number, alpha: number): Num[] {
  const out: Num[] = new Array(src.length).fill(undefined);
  let seed = 0;
  let count = 0;
  let value: number | undefined;
  for (let i = 0; i < src.length; i++) {
    const v = src[i];
    if (v === undefined) continue;
    if (value === undefined) {
      seed += v;
      count++;
      if (count === period) out[i] = value = seed / period;
      continue;
    }
    value += alpha * (v - value);
    out[i] = value;
  }
  return out;
}

/** Exponential moving average, seeded with the simple average of its first `period` values. */
export function emaOf(src: readonly Num[], period: number): Num[] {
  return smoothOf(src, period, 2 / (period + 1));
}

/** Linearly weighted moving average: the newest of `period` values weighs `period`, the oldest 1 (none across a gap). */
export function wmaOf(src: readonly Num[], period: number): Num[] {
  const out: Num[] = new Array(src.length).fill(undefined);
  const denom = (period * (period + 1)) / 2;
  for (let i = period - 1; i < src.length; i++) {
    let sum = 0;
    let whole = true;
    for (let k = 0; k < period; k++) {
      const v = src[i - period + 1 + k];
      if (v === undefined) {
        whole = false;
        break;
      }
      sum += v * (k + 1);
    }
    if (whole) out[i] = sum / denom;
  }
  return out;
}

/** Wilder's smoothing (RMA, SMMA): an EMA with alpha 1 / period. */
export function rmaOf(src: readonly Num[], period: number): Num[] {
  return smoothOf(src, period, 1 / period);
}

/** Population standard deviation over the last `period` values (none across a gap). */
export function stdevOf(src: readonly Num[], period: number): Num[] {
  const out: Num[] = new Array(src.length).fill(undefined);
  for (let i = period - 1; i < src.length; i++) {
    let sum = 0;
    let sumSq = 0;
    let ok = true;
    for (let j = i - period + 1; j <= i; j++) {
      const v = src[j];
      if (v === undefined) { ok = false; break; }
      sum += v;
      sumSq += v * v;
    }
    if (!ok) continue;
    const mean = sum / period;
    out[i] = Math.sqrt(Math.max(0, sumSq / period - mean * mean));
  }
  return out;
}

/** Each bar's true range: its range, stretched to the previous close. */
export function trueRanges(data: DataSeries): number[] {
  return data.map((bar, i) => {
    if (i === 0) return bar.high - bar.low;
    const prev = data[i - 1].close;
    return Math.max(bar.high - bar.low, Math.abs(bar.high - prev), Math.abs(bar.low - prev));
  });
}

/** Highest of `src` over the `period` values ending at `i` (undefined if any is missing). */
export function highestAt(src: readonly Num[], i: number, period: number): Num {
  if (i < period - 1) return undefined;
  let best = -Infinity;
  for (let j = i - period + 1; j <= i; j++) {
    const v = src[j];
    if (v === undefined) return undefined;
    if (v > best) best = v;
  }
  return best;
}

/** Lowest of `src` over the `period` values ending at `i` (undefined if any is missing). */
export function lowestAt(src: readonly Num[], i: number, period: number): Num {
  if (i < period - 1) return undefined;
  let best = Infinity;
  for (let j = i - period + 1; j <= i; j++) {
    const v = src[j];
    if (v === undefined) return undefined;
    if (v < best) best = v;
  }
  return best;
}

/** Per-bar points `{ [key]: v }` from per-bar numbers (null where there is none). */
export function pointsOf(src: readonly Num[], key = 'value'): (IndicatorValue | null)[] {
  return src.map((v) => (v !== undefined && Number.isFinite(v) ? { [key]: v } : null));
}

/** Mean and population standard deviation of the closes of the `period` bars ending at `i`. */
export function closeStatsAt(data: DataSeries, i: number, period: number): { mean: number; sd: number } | undefined {
  if (i < period - 1 || i >= data.length) return undefined;
  let sum = 0;
  let sumSq = 0;
  for (let j = i - period + 1; j <= i; j++) {
    const c = data[j].close;
    sum += c;
    sumSq += c * c;
  }
  const mean = sum / period;
  return { mean, sd: Math.sqrt(Math.max(0, sumSq / period - mean * mean)) };
}

/** Highest high of the `period` bars ending at `i`. */
export function highAt(data: DataSeries, i: number, period: number): number | undefined {
  if (i < period - 1) return undefined;
  let best = -Infinity;
  for (let j = i - period + 1; j <= i; j++) if (data[j].high > best) best = data[j].high;
  return best;
}

/** Lowest low of the `period` bars ending at `i`. */
export function lowAt(data: DataSeries, i: number, period: number): number | undefined {
  if (i < period - 1) return undefined;
  let best = Infinity;
  for (let j = i - period + 1; j <= i; j++) if (data[j].low < best) best = data[j].low;
  return best;
}

/** Simple average of the closes of the `period` bars ending at `i`. */
export function closeMeanAt(data: DataSeries, i: number, period: number): number | undefined {
  if (i < period - 1) return undefined;
  let sum = 0;
  for (let j = i - period + 1; j <= i; j++) sum += data[j].close;
  return sum / period;
}

/**
 * The least-squares line through the `period` closes ending at bar `i`
 * (x the bar's place in the window, 0 to period − 1): its slope, its value
 * at the last bar, the standard error of the closes about it, and their
 * correlation with time. Undefined before the window fills.
 */
export function regressionAt(
  data: DataSeries,
  i: number,
  period: number,
): { slope: number; end: number; stdErr: number; r: number } | undefined {
  if (period < 2 || i < period - 1) return undefined;
  const n = period;
  const meanX = (n - 1) / 2;
  let meanY = 0;
  for (let k = 0; k < n; k++) meanY += data[i - n + 1 + k].close;
  meanY /= n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let k = 0; k < n; k++) {
    const dx = k - meanX;
    const dy = data[i - n + 1 + k].close - meanY;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;
  let sse = 0;
  for (let k = 0; k < n; k++) {
    const e = data[i - n + 1 + k].close - (intercept + slope * k);
    sse += e * e;
  }
  return {
    slope,
    end: intercept + slope * (n - 1),
    stdErr: n > 2 ? Math.sqrt(sse / (n - 2)) : 0,
    r: syy === 0 ? 0 : sxy / Math.sqrt(sxx * syy),
  };
}
