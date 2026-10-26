import type { IndicatorValue, TimeFrame } from '@tradecanvas/commons';
import {
  barTimeUnit,
  barsAreDaily,
  isUtcTimeZone,
  timeframeBucketStart,
  timeframeFollowsDays,
  timeframeToMs,
  zoneOffsetMinutes,
} from '@tradecanvas/commons';

/**
 * The periods indicators start again at, read the same way everywhere: VWAP's
 * anchor, Session VWAP, the MTF moving average, the prior-day lines and the
 * market profile's days. The chart then has one definition of the day.
 */

/** A trading day, a week from Monday, or a month from the 1st. */
export type PeriodAnchor = 'session' | 'week' | 'month';

/** From a bar's time, as its series gives it (seconds or milliseconds), to a key of its period. */
export type PeriodKeyer = (time: number) => number;

const ANCHOR_FRAMES: Record<PeriodAnchor, TimeFrame> = { session: '1d', week: '1w', month: '1M' };
const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;
/**
 * Half a frame past a bucket's end is inside the next bucket: a month of 28
 * to 31 days, counted as 30, still lands there.
 */
const NEXT_BUCKET_REACH = 1.5;

function isAnchor(period: string): period is PeriodAnchor {
  return period === 'session' || period === 'week' || period === 'month';
}

/**
 * The period of each bar of `data`: its day, week or month, or its bucket of
 * any timeframe (`'4h'`, `'1d'`). Bars are read on the exchange's clock
 * (`zone`, an IANA name the caller has checked; UTC without one), as
 * `timeframeBucketStart` starts the bars the library builds: the zone moves
 * only the frames that start at a midnight (days, weeks, months, 2h to 12h).
 * Daily-or-larger bars stamped at 00:00 UTC, as resamplers and most feeds
 * stamp them, are the date they name; stamped at any other hour (the
 * exchange's midnight, its open), they are read on its clock too.
 *
 * A key is the period's start on that clock written as UTC: a day's is its
 * date at 00:00 UTC. The last period's bounds are kept, so the bucket is
 * worked out once a period and a bar inside it costs one offset lookup.
 */
export function periodKeyer(data: ArrayLike<{ time: number }>, period: PeriodAnchor | TimeFrame, zone?: string | null): PeriodKeyer {
  const frame = isAnchor(period) ? ANCHOR_FRAMES[period] : period;
  const unit = barTimeUnit(data);
  const clock = zone && !isUtcTimeZone(zone) && timeframeFollowsDays(frame) ? zone : null;
  const dates = clock !== null && barsAreDaily(data) === true;
  const span = timeframeToMs(frame);
  const reach = (Number.isFinite(span) ? span : MINUTE_MS) * NEXT_BUCKET_REACH;
  let start = NaN;
  let end = NaN;
  return (time) => {
    const ms = time * unit;
    const wall = clock === null || (dates && ms % DAY_MS === 0) ? ms : ms + zoneOffsetMinutes(clock, ms) * MINUTE_MS;
    if (!(wall >= start && wall < end)) {
      start = timeframeBucketStart(wall, frame);
      end = timeframeBucketStart(start + reach, frame);
    }
    return start;
  };
}

type PeriodSeries = ArrayLike<IndicatorValue | null | undefined>;

/** Whether bar `i` holds its period alone: neither bar beside it is in the same one. */
function alone(series: PeriodSeries, i: number): boolean {
  const key = series[i]?.session;
  return series[i - 1]?.session !== key && series[i + 1]?.session !== key;
}

/**
 * Whether a line drawn by period (each point's `session` key) breaks between
 * the points of bars `a` and `b`: they are in different periods, unless each
 * holds its period alone. A session's average on daily bars is then one line
 * through the bars' typical prices, while two longer periods are never
 * joined. Read from the bars beside each, not from what is on screen, so the
 * line stays the same as it scrolls.
 */
export function breaksBetween(series: PeriodSeries, a: number, b: number): boolean {
  if (series[a]?.session === series[b]?.session) return false;
  return !(alone(series, a) && alone(series, b));
}
