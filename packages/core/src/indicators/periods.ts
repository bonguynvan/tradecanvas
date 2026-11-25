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
const DAY_MINUTES = 1440;
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
export function periodKeyer(data: ArrayLike<{ time: number }>, period: PeriodAnchor | TimeFrame, zone?: string | null, dayStart?: number | null): PeriodKeyer {
  const shifted = dayShift(period, dayStart);
  if (shifted > 0) return shiftedKeyer(data, isAnchor(period) ? ANCHOR_FRAMES[period] : period, zone, shifted);
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

/**
 * How far a bar's time is moved before its day is read, ms: a trading day
 * that starts at 17:00 is read as the day 7 hours on, so it is named by the
 * date it ends on. None for a day that starts at midnight, and for frames
 * shorter than a day, which keep the exchange's midnight.
 */
function dayShift(period: PeriodAnchor | TimeFrame, dayStart: number | null | undefined): number {
  if (dayStart === null || dayStart === undefined || !Number.isFinite(dayStart)) return 0;
  const start = Math.round(dayStart);
  if (start <= 0 || start >= DAY_MINUTES) return 0;
  const frame = isAnchor(period) ? ANCHOR_FRAMES[period] : period;
  if (!(timeframeToMs(frame) >= DAY_MS)) return 0;
  return (DAY_MINUTES - start) * MINUTE_MS;
}

/**
 * The keyer for a trading day that does not start at midnight: each bar's
 * time on the exchange's clock, moved by `shift`, bucketed as UTC's would be.
 * Read on the wall clock, so a day keeps its 17:00 start across a change of
 * the clocks. A daily bar stamped at 00:00 UTC is still the date it names.
 * The last period's bounds are kept, as the plain keyer keeps them.
 */
function shiftedKeyer(data: ArrayLike<{ time: number }>, frame: TimeFrame, zone: string | null | undefined, shift: number): PeriodKeyer {
  const unit = barTimeUnit(data);
  const clock = zone && !isUtcTimeZone(zone) && isValidTimeZone(zone) ? zone : null;
  const dates = barsAreDaily(data) === true;
  const reach = timeframeToMs(frame) * NEXT_BUCKET_REACH;
  let start = NaN;
  let end = NaN;
  return (time) => {
    const ms = time * unit;
    const wall = dates && ms % DAY_MS === 0 ? ms : ms + (clock === null ? 0 : zoneOffsetMinutes(clock, ms) * MINUTE_MS) + shift;
    if (wall >= start && wall < end) return start;
    start = timeframeBucketStart(wall, frame);
    end = timeframeBucketStart(start + reach, frame);
    return start;
  };
}

type PeriodSeries = ArrayLike<IndicatorValue | null | undefined>;

/** Whether bar `i` holds its period alone: neither bar beside it is in the same one. */
function alone(series: PeriodSeries, i: number, field: string): boolean {
  const key = series[i]?.[field];
  return series[i - 1]?.[field] !== key && series[i + 1]?.[field] !== key;
}

/**
 * Whether a line drawn by period (each point's `field`, `session` unless
 * another is named) breaks between
 * the points of bars `a` and `b`: they are in different periods, unless each
 * holds its period alone. A session's average on daily bars is then one line
 * through the bars' typical prices, while two longer periods are never
 * joined. Read from the bars beside each, not from what is on screen, so the
 * line stays the same as it scrolls.
 */
export function breaksBetween(series: PeriodSeries, a: number, b: number, field = 'session'): boolean {
  if (series[a]?.[field] === series[b]?.[field]) return false;
  return !(alone(series, a, field) && alone(series, b, field));
}
