import type { OHLCBar, DataSeries } from '../types/ohlc.js';

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

export function computePriceRange(
  data: DataSeries,
  from: number,
  to: number,
  padding = 0.05,
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
  const range = max - min || 1;
  return {
    min: min - range * padding,
    max: max + range * padding,
  };
}

export function mergeBar(existing: OHLCBar, tick: { price: number; volume?: number; time: number }): OHLCBar {
  return {
    ...existing,
    high: Math.max(existing.high, tick.price),
    low: Math.min(existing.low, tick.price),
    close: tick.price,
    volume: existing.volume + (tick.volume ?? 0),
    time: tick.time,
  };
}
