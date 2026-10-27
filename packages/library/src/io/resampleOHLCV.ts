import type { DataSeries, TimeFrame } from '@tradecanvas/commons';
import { resampleBars, timeframeToMs } from '@tradecanvas/commons';

export interface ResampleOptions {
  /** 0 = Sunday, 1 = Monday (default) — anchor for weekly buckets. */
  weekStartsOn?: 0 | 1;
  /**
   * The exchange's zone (an IANA name): days, weeks, months and the hour
   * frames that divide a day start at its midnight. Left out, UTC's.
   */
  timeZone?: string;
}

/**
 * Aggregate a finer OHLCV series into a coarser timeframe.
 *
 * Bars are grouped by calendar-aware bucket (see `resampleBars` and
 * `timeframeBucketStart`): open = first bar's open, high/low = extremes,
 * close = last bar's close, volume = sum. Daily bars stamped at 00:00 UTC
 * keep the dates they name. Input bars are assumed sorted ascending by
 * `time` and are never mutated.
 *
 * Upsampling (target finer than source) cannot synthesize data — pass a target
 * coarser than the source. Use `inferTimeframeMs` to detect the source spacing.
 */
export function resampleOHLCV(
  bars: DataSeries,
  target: TimeFrame,
  opts: ResampleOptions = {},
): DataSeries {
  return resampleBars(bars, target, { weekStartsOn: opts.weekStartsOn ?? 1, timeZone: opts.timeZone });
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
