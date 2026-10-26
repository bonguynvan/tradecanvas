import type { OHLCBar, TimeFrame, TimeFrameUnit } from '../types/ohlc.js';
import { barsAreDaily, parseTimeframe, timeframeBucketStart, timeframeFollowsDays, timeframeToMs, type BucketOptions } from './time.js';
import { isUtcTimeZone, offsetAt } from './timezone.js';

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

/**
 * Aggregate bars (ascending, times in ms) into a coarser timeframe: per
 * bucket (see `timeframeBucketStart`) the first open, the extremes, the last
 * close and the summed volume. The input bars are not changed.
 *
 * With a `timeZone`, days, weeks, months and the hour frames that divide a
 * day start at its midnight. Daily-or-longer bars stamped at 00:00 UTC are
 * read as the dates they name (unless `dates` says otherwise), so a Monday
 * stays in its own week west of UTC, and the weeks keep 00:00 UTC stamps.
 */
export function resampleBars(bars: readonly OHLCBar[], target: TimeFrame, options: 0 | 1 | BucketOptions = 1): OHLCBar[] {
  const bucket = bucketOptionsFor(bars, target, options);
  const out: OHLCBar[] = [];
  let current: OHLCBar | null = null;
  for (const bar of bars) {
    const key = timeframeBucketStart(bar.time, target, bucket);
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

/** The options as `timeframeBucketStart` takes them, with `dates` read from the bars when a zone needs it. */
function bucketOptionsFor(bars: readonly OHLCBar[], target: TimeFrame, options: 0 | 1 | BucketOptions): 0 | 1 | BucketOptions {
  if (typeof options === 'number' || options.timeZone === undefined || options.dates !== undefined) return options;
  if (isUtcTimeZone(options.timeZone) || !timeframeFollowsDays(target)) return options;
  return { ...options, dates: barsAreDaily(bars) === true };
}

const isFixedLength = (unit: TimeFrameUnit): boolean => unit === 's' || unit === 'm' || unit === 'h' || unit === 'd';

/** Whether whole bars of `base` fill every bucket of `target` exactly. */
function buildsInto(base: TimeFrame, target: TimeFrame): boolean {
  const b = parseTimeframe(base);
  const t = parseTimeframe(target);
  if (!b || !t) return false;
  const baseMs = timeframeToMs(base);
  // Feeds disagree on where a 3-day bar starts: only build from whole days.
  if (b.unit === 'd' && b.count > 1) return false;
  if (isFixedLength(t.unit)) {
    return isFixedLength(b.unit) && timeframeToMs(target) % baseMs === 0;
  }
  if (b.unit === t.unit) return t.count % b.count === 0;
  // Weeks and months start at midnight: build them from bars that never
  // cross one.
  return isFixedLength(b.unit) && DAY_MS % baseMs === 0;
}

/**
 * Whether bars of `base`, which feeds start on UTC's clock, also start on
 * every midnight of `timeZone`: its offset, in winter and in summer, is a
 * whole number of them. Bars of a day or more line up as dates.
 */
function linesUpWith(base: TimeFrame, timeZone: string | number): boolean {
  const baseMs = timeframeToMs(base);
  if (!(baseMs < DAY_MS)) return true;
  const year = new Date().getUTCFullYear();
  return [Date.UTC(year, 0, 1), Date.UTC(year, 6, 1)].every((at) => (offsetAt(timeZone, at) * MINUTE_MS) % baseMs === 0);
}

/**
 * The coarsest of `supported` that builds `target` from whole bars (e.g. 7m
 * from 1m, 90m from 30m, a quarter from months), or null when none does.
 * With a `timeZone`, a target whose buckets start at its midnight (days,
 * weeks, months, 2h to 12h) takes only bars that line up with it: 1h for
 * Ho Chi Minh City's days, not 4h.
 */
export function pickBaseTimeframe(
  target: TimeFrame,
  supported: readonly TimeFrame[],
  options: Pick<BucketOptions, 'timeZone'> = {},
): TimeFrame | null {
  const { timeZone } = options;
  const zone = timeZone !== undefined && !isUtcTimeZone(timeZone) && timeframeFollowsDays(target) ? timeZone : undefined;
  let best: TimeFrame | null = null;
  let bestMs = 0;
  for (const tf of supported) {
    if (!buildsInto(tf, target)) continue;
    if (zone !== undefined && !linesUpWith(tf, zone)) continue;
    const ms = timeframeToMs(tf);
    if (ms > bestMs) {
      best = tf;
      bestMs = ms;
    }
  }
  return best;
}
