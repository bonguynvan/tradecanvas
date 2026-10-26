import type { BucketOptions, IndicatorValue, TimeFrame } from '@tradecanvas/commons';
import {
  barTimeUnit,
  barsAreDaily,
  isUtcTimeZone,
  isValidTimeZone,
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
/** UTC's buckets: weeks from Monday, days from its midnight. */
const UTC_BUCKETS: BucketOptions = {};
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
 * (`zone`, an IANA name; UTC without one, or for one the browser does not
 * know), with `timeframeBucketStart`, as the library starts the bars it
 * builds: the zone moves only the frames that start at a midnight (days,
 * weeks, months, 2h to 12h). Daily-or-larger bars stamped at 00:00 UTC, as
 * resamplers and most feeds stamp them, are the date they name, as
 * `BucketOptions.dates` reads them; stamped at any other hour (the
 * exchange's midnight, its open), they are read on its clock too.
 *
 * A key is the period's start on that clock written as UTC: a day's is its
 * date at 00:00 UTC, however its bars are stamped, so a London feed's daily
 * bars (23:00 UTC in summer, 00:00 in winter) keep a month whole. The last
 * period's bounds are kept in real time, for the reading its bars had: the
 * bucket is worked out once a period, and a bar inside it costs a compare.
 */
export function periodKeyer(data: ArrayLike<{ time: number }>, period: PeriodAnchor | TimeFrame, zone?: string | null): PeriodKeyer {
  const frame = isAnchor(period) ? ANCHOR_FRAMES[period] : period;
  const unit = barTimeUnit(data);
  const clock = zone && !isUtcTimeZone(zone) && timeframeFollowsDays(frame) && isValidTimeZone(zone) ? zone : null;
  const onClock: BucketOptions = clock === null ? UTC_BUCKETS : { timeZone: clock };
  const dates = clock !== null && barsAreDaily(data) === true;
  const span = timeframeToMs(frame);
  const reach = (Number.isFinite(span) ? span : MINUTE_MS) * NEXT_BUCKET_REACH;
  let start = NaN;
  let end = NaN;
  let key = NaN;
  let boundsAreDates = false;
  return (time) => {
    const ms = time * unit;
    const isDate = dates && ms % DAY_MS === 0;
    if (ms >= start && ms < end && isDate === boundsAreDates) return key;
    boundsAreDates = isDate;
    const options = isDate ? UTC_BUCKETS : onClock;
    start = timeframeBucketStart(ms, frame, options);
    end = timeframeBucketStart(start + reach, frame, options);
    key = clock === null || isDate ? start : timeframeBucketStart(ms + zoneOffsetMinutes(clock, ms) * MINUTE_MS, frame);
    return key;
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
