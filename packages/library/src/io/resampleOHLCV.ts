import type { DataSeries, OHLCBar, TimeFrame } from '@tradecanvas/commons';
import { timeframeToMs, timeframeBucketStart } from '@tradecanvas/commons';

export interface ResampleOptions {
  /** 0 = Sunday, 1 = Monday (default) — anchor for weekly buckets. */
  weekStartsOn?: 0 | 1;
}

/**
 * Aggregate a finer OHLCV series into a coarser timeframe.
 *
 * Bars are grouped by calendar-aware bucket (see `timeframeBucketStart`):
 * open = first bar's open, high/low = extremes, close = last bar's close,
 * volume = sum. Input bars are assumed sorted ascending by `time` and are
 * never mutated.
 *
 * Upsampling (target finer than source) cannot synthesize data — pass a target
 * coarser than the source. Use `inferTimeframeMs` to detect the source spacing.
 */
export function resampleOHLCV(
  bars: DataSeries,
  target: TimeFrame,
  opts: ResampleOptions = {},
): DataSeries {
  if (bars.length === 0) return [];
  const weekStartsOn = opts.weekStartsOn ?? 1;

  const out: OHLCBar[] = [];
  let current: OHLCBar | null = null;
  let currentKey = Number.NaN;

  for (const bar of bars) {
    const key = timeframeBucketStart(bar.time, target, weekStartsOn);
    if (current === null || key !== currentKey) {
      if (current !== null) out.push(current);
      current = {
        time: key,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
      };
      currentKey = key;
    } else {
      current = {
        time: current.time,
        open: current.open,
        high: Math.max(current.high, bar.high),
        low: Math.min(current.low, bar.low),
        close: bar.close,
        volume: current.volume + bar.volume,
      };
    }
  }
  if (current !== null) out.push(current);
  return out;
}

/**
 * Estimate the source bar spacing in milliseconds from the median gap between
 * consecutive bars. Robust to occasional gaps (weekends, halts). Returns 0 for
 * series with fewer than two bars.
 */
export function inferTimeframeMs(bars: DataSeries): number {
  if (bars.length < 2) return 0;
  const gaps: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const gap = bars[i].time - bars[i - 1].time;
    if (gap > 0) gaps.push(gap);
  }
  if (gaps.length === 0) return 0;
  gaps.sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length / 2)];
}

/**
 * Whether `target` is coarser than (or equal to) the source spacing, i.e. a
 * valid downsample. A non-positive `sourceMs` (unknown) is treated as valid.
 */
export function canResample(sourceMs: number, target: TimeFrame): boolean {
  if (sourceMs <= 0) return true;
  return timeframeToMs(target) >= sourceMs;
}
