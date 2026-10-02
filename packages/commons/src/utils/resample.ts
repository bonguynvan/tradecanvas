import type { OHLCBar, TimeFrame, TimeFrameUnit } from '../types/ohlc.js';
import { parseTimeframe, timeframeBucketStart, timeframeToMs } from './time.js';

const DAY_MS = 86_400_000;

/**
 * Aggregate bars (ascending, times in ms) into a coarser timeframe: per
 * bucket (see `timeframeBucketStart`) the first open, the extremes, the last
 * close and the summed volume. The input bars are not changed.
 */
export function resampleBars(bars: readonly OHLCBar[], target: TimeFrame, weekStartsOn: 0 | 1 = 1): OHLCBar[] {
  const out: OHLCBar[] = [];
  let current: OHLCBar | null = null;
  for (const bar of bars) {
    const key = timeframeBucketStart(bar.time, target, weekStartsOn);
    if (current === null || key !== current.time) {
      current = { time: key, open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: bar.volume };
      out.push(current);
    } else {
      if (bar.high > current.high) current.high = bar.high;
      if (bar.low < current.low) current.low = bar.low;
      current.close = bar.close;
      current.volume += bar.volume;
    }
  }
  return out;
}

const isFixedLength = (unit: TimeFrameUnit): boolean => unit === 's' || unit === 'm' || unit === 'h' || unit === 'd';

/** Whether whole bars of `base` fill every bucket of `target` exactly. */
function buildsInto(base: TimeFrame, target: TimeFrame): boolean {
  const b = parseTimeframe(base);
  const t = parseTimeframe(target);
  if (!b || !t) return false;
  const baseMs = timeframeToMs(base);
  if (isFixedLength(t.unit)) {
    return isFixedLength(b.unit) && timeframeToMs(target) % baseMs === 0;
  }
  if (b.unit === t.unit) return t.count % b.count === 0;
  // Weeks and months start at midnight: build them from bars that never
  // cross one.
  return isFixedLength(b.unit) && DAY_MS % baseMs === 0;
}

/**
 * The coarsest of `supported` that builds `target` from whole bars (e.g. 7m
 * from 1m, 90m from 30m, a quarter from months), or null when none does.
 */
export function pickBaseTimeframe(target: TimeFrame, supported: readonly TimeFrame[]): TimeFrame | null {
  let best: TimeFrame | null = null;
  let bestMs = 0;
  for (const tf of supported) {
    if (!buildsInto(tf, target)) continue;
    const ms = timeframeToMs(tf);
    if (ms > bestMs) {
      best = tf;
      bestMs = ms;
    }
  }
  return best;
}
