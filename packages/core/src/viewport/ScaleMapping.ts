import type { ViewportState } from '@tradecanvas/commons';

export function barIndexToX(index: number, viewport: ViewportState): number {
  const barUnit = viewport.barWidth + viewport.barSpacing;
  return index * barUnit - viewport.offset + viewport.chartRect.x + viewport.barWidth / 2;
}

export function priceToY(price: number, viewport: ViewportState): number {
  const { min, max } = viewport.priceRange;
  if (viewport.logScale && min > 0 && max > 0) {
    const logMin = Math.log(min);
    const logMax = Math.log(max);
    const logRange = logMax - logMin;
    if (logRange === 0) return viewport.chartRect.y + viewport.chartRect.height / 2;
    const ratio = (Math.log(Math.max(price, Number.EPSILON)) - logMin) / logRange;
    return viewport.chartRect.y + viewport.chartRect.height * (1 - ratio);
  }
  const range = max - min;
  if (range === 0) return viewport.chartRect.y + viewport.chartRect.height / 2;
  const ratio = (price - min) / range;
  return viewport.chartRect.y + viewport.chartRect.height * (1 - ratio);
}

export function xToBarIndex(x: number, viewport: ViewportState): number {
  const barUnit = viewport.barWidth + viewport.barSpacing;
  return Math.round((x - viewport.chartRect.x - viewport.barWidth / 2 + viewport.offset) / barUnit);
}

export function yToPrice(y: number, viewport: ViewportState): number {
  const { min, max } = viewport.priceRange;
  const ratio = 1 - (y - viewport.chartRect.y) / viewport.chartRect.height;
  if (viewport.logScale && min > 0 && max > 0) {
    const logMin = Math.log(min);
    const logMax = Math.log(max);
    return Math.exp(logMin + (logMax - logMin) * ratio);
  }
  return min + (max - min) * ratio;
}

type TimedSeries = ReadonlyArray<{ time: number }>;

const stepCache = new WeakMap<TimedSeries, { length: number; step: number }>();

/**
 * Typical spacing between bar times — the median of the last ~20 intervals,
 * so a weekend or halt gap doesn't skew it. Used to place times beyond either
 * end of the data (the empty future the chart can be panned into). Cached per
 * series and length; 0 when there are fewer than two bars.
 */
export function barTimeStep(data: TimedSeries): number {
  const n = data.length;
  if (n < 2) return 0;
  const cached = stepCache.get(data);
  if (cached && cached.length === n) return cached.step;
  const diffs: number[] = [];
  for (let i = Math.max(1, n - 20); i < n; i++) diffs.push(data[i].time - data[i - 1].time);
  diffs.sort((a, b) => a - b);
  const step = Math.max(0, diffs[diffs.length >> 1]);
  stepCache.set(data, { length: n, step });
  return step;
}

/**
 * Time at bar index `index`, extrapolated by `barTimeStep` past either end of
 * the data — e.g. the future area right of the newest bar.
 */
export function barIndexToTime(index: number, data: TimedSeries): number {
  const n = data.length;
  if (n === 0) return index;
  const last = n - 1;
  if (index > last) return data[last].time + (index - last) * barTimeStep(data);
  if (index < 0) return data[0].time + index * barTimeStep(data);
  const lo = Math.floor(index);
  if (lo === index || lo >= last) return data[lo].time;
  return data[lo].time + (index - lo) * (data[lo + 1].time - data[lo].time);
}

/**
 * Convert a bar timestamp to its data-array index via binary search.
 * Falls back to fractional interpolation when the timestamp falls between bars,
 * and extrapolates (by `barTimeStep`) for times beyond either end — so a drawing
 * anchored in the future keeps its place instead of collapsing onto the last bar.
 * Returns -1 if data is empty.
 */
export function timestampToBarIndex(timestamp: number, data: TimedSeries): number {
  if (data.length === 0) return -1;
  const first = data[0].time;
  const lastIdx = data.length - 1;
  const lastTime = data[lastIdx].time;
  if (timestamp <= first || timestamp >= lastTime) {
    if (timestamp === first) return 0;
    if (timestamp === lastTime) return lastIdx;
    const step = barTimeStep(data);
    if (step <= 0) return timestamp < first ? 0 : lastIdx;
    return timestamp < first ? (timestamp - first) / step : lastIdx + (timestamp - lastTime) / step;
  }
  // Binary search
  let lo = 0, hi = data.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (data[mid].time === timestamp) return mid;
    if (data[mid].time < timestamp) lo = mid + 1;
    else hi = mid - 1;
  }
  // lo is the insertion point; interpolate between hi and lo
  if (lo >= data.length) return data.length - 1;
  if (hi < 0) return 0;
  const tLo = data[hi].time, tHi = data[lo].time;
  const frac = tHi !== tLo ? (timestamp - tLo) / (tHi - tLo) : 0;
  return hi + frac;
}

/**
 * Resolve an anchor `time` value to a (possibly fractional) bar index in the
 * current series. When `viewport.data` is set, `time` is interpreted as a real
 * timestamp and converted via `timestampToBarIndex`. Otherwise `time` is
 * already a bar index and is returned unchanged.
 */
export function resolveBarIndex(time: number, viewport: ViewportState): number {
  const data = viewport.data;
  if (data && data.length > 0) {
    return timestampToBarIndex(time, data);
  }
  return time;
}

/**
 * Map an anchor `time` value to its pixel x. Works whether `time` is a
 * timestamp (when `viewport.data` is set) or a bar index (legacy callers).
 */
export function timeToX(time: number, viewport: ViewportState): number {
  return barIndexToX(resolveBarIndex(time, viewport), viewport);
}

/**
 * Map a pixel x back to an anchor `time` value. Returns a real timestamp when
 * `viewport.data` is set (so the value survives timeframe switches), otherwise
 * returns a bar index for legacy callers.
 */
export function xToTime(x: number, viewport: ViewportState): number {
  const idx = xToBarIndex(x, viewport);
  const data = viewport.data;
  if (data && data.length > 0) {
    // Past either end (the empty future, or before the oldest bar) the time
    // is extrapolated, so drawings can be placed there.
    return barIndexToTime(idx, data);
  }
  return idx;
}
