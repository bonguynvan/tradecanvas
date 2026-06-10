import type { DataSeries, AnchorPoint } from '@tradecanvas/commons';

/**
 * The dominant swing within `[from, to]`: the extreme high and extreme low,
 * returned as two anchors in time order so a Fibonacci retracement drawn from
 * them follows the swing direction (up-swing = low→high, down-swing =
 * high→low). Returns null when there is no usable two-point swing (empty range
 * or the high and low fall on the same bar).
 */
export function findDominantSwing(
  data: DataSeries,
  from: number,
  to: number,
): [AnchorPoint, AnchorPoint] | null {
  const lo = Math.max(0, from);
  const hi = Math.min(data.length - 1, to);
  if (hi <= lo) return null;

  let highIdx = lo;
  let lowIdx = lo;
  for (let i = lo; i <= hi; i++) {
    if (data[i].high > data[highIdx].high) highIdx = i;
    if (data[i].low < data[lowIdx].low) lowIdx = i;
  }
  if (highIdx === lowIdx) return null;

  const highAnchor: AnchorPoint = { time: data[highIdx].time, price: data[highIdx].high };
  const lowAnchor: AnchorPoint = { time: data[lowIdx].time, price: data[lowIdx].low };

  // Order by time so the fib's first anchor is the earlier swing point.
  return highIdx < lowIdx ? [highAnchor, lowAnchor] : [lowAnchor, highAnchor];
}
