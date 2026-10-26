import type { KnownTimeFrame, TimeFrame, TimeFrameUnit } from '../types/ohlc.js';
import { isUtcTimeZone, offsetAt, wallToUtc, type TimeZoneSetting } from './timezone.js';
import { barTimeUnit } from './data.js';

const TIMEFRAME_MS: Record<KnownTimeFrame, number> = {
  '1s': 1_000,
  '5s': 5_000,
  '15s': 15_000,
  '30s': 30_000,
  '1m': 60_000,
  '3m': 180_000,
  '5m': 300_000,
  '15m': 900_000,
  '30m': 1_800_000,
  '45m': 2_700_000,
  '1h': 3_600_000,
  '2h': 7_200_000,
  '3h': 10_800_000,
  '4h': 14_400_000,
  '6h': 21_600_000,
  '8h': 28_800_000,
  '12h': 43_200_000,
  '1d': 86_400_000,
  '2d': 172_800_000,
  '3d': 259_200_000,
  '1w': 604_800_000,
  '2w': 1_209_600_000,
  '1M': 2_592_000_000,
  '3M': 7_776_000_000,
  '6M': 15_552_000_000,
  '12M': 31_536_000_000,
};

/** Milliseconds per unit; a month counts 30 days (a 12-month frame, 365). */
const UNIT_MS: Record<TimeFrameUnit, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
  M: 2_592_000_000,
};

const TIMEFRAME_PATTERN = /^([1-9]\d*)([smhdwM])$/;

/** A timeframe's count and unit, or null when `value` isn't one (`'7m'` → 7 minutes). */
export function parseTimeframe(value: string): { count: number; unit: TimeFrameUnit } | null {
  const match = TIMEFRAME_PATTERN.exec(value);
  if (!match) return null;
  const count = Number(match[1]);
  return Number.isSafeInteger(count) ? { count, unit: match[2] as TimeFrameUnit } : null;
}

/** Most trades a tick bar may hold. */
const MAX_TICKS_PER_BAR = 1_000_000;

/** The trades per bar of a tick timeframe (`'100T'` → 100), or null for any other. */
export function tickBarCount(timeframe: string): number | null {
  const match = /^([1-9]\d*)T$/.exec(timeframe);
  if (!match) return null;
  const count = Number(match[1]);
  return Number.isSafeInteger(count) && count <= MAX_TICKS_PER_BAR ? count : null;
}

export function isTimeFrame(value: string): value is TimeFrame {
  return parseTimeframe(value) !== null;
}

/** Length of a timeframe in milliseconds (approximate for months); NaN for a non-timeframe. */
export function timeframeToMs(tf: TimeFrame): number {
  const known = TIMEFRAME_MS[tf as KnownTimeFrame];
  if (known !== undefined) return known;
  const parsed = parseTimeframe(tf);
  return parsed ? parsed.count * UNIT_MS[parsed.unit] : Number.NaN;
}

export function formatTimestamp(timestamp: number, tf: TimeFrame): string {
  const d = new Date(timestamp);
  const ms = timeframeToMs(tf);
  if (ms >= 86_400_000) {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  if (ms >= 3_600_000) {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function alignToTimeframe(timestamp: number, tf: TimeFrame): number {
  const ms = timeframeToMs(tf);
  return Math.floor(timestamp / ms) * ms;
}

export interface TimeParts {
  year: number;
  /** 1 to 12. */
  month: number;
  day: number;
  hours: number;
  minutes: number;
}

/**
 * Calendar parts of a timestamp in a display timezone: an IANA zone
 * (`'America/New_York'`, daylight saving time included), a fixed UTC offset in
 * minutes (e.g. -300 for EST) or the browser's zone (`null`).
 */
export function timeParts(timeMs: number, tz: TimeZoneSetting): TimeParts {
  if (tz === null) {
    const d = new Date(timeMs);
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
      hours: d.getHours(),
      minutes: d.getMinutes(),
    };
  }
  const d = new Date(timeMs + offsetAt(tz, timeMs) * 60_000);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hours: d.getUTCHours(),
    minutes: d.getUTCMinutes(),
  };
}

/**
 * A bar with no time-of-day component (a daily, weekly, monthly or yearly candle — always anchored
 * to a calendar-day boundary, so hours/minutes read 00:00) needs the YEAR in its label instead: a
 * bare `month/day` is ambiguous across years, and `00:00` tells a trader nothing. Detected from the
 * parts themselves rather than a separate timeframe parameter, so every caller that formats a bar's
 * time gets the same rule for free. It can't tell an hourly bar at midnight from a daily one:
 * callers that have the series ask `barsAreDaily` first and fall back to this.
 */
export function isDateOnly(parts: Pick<TimeParts, 'hours' | 'minutes'>): boolean {
  return parts.hours === 0 && parts.minutes === 0;
}

/** Gaps this long or longer (a day with a daylight-saving change is 23 h) mean daily-or-larger bars. */
const DAILY_GAP_MS = 20 * 3_600_000;

/**
 * Whether bars are a day apart or more (daily, weekly, monthly): their labels
 * then carry a date and no time of day, while an hourly bar at midnight keeps
 * its time. Read from the smallest gap among the first bars, so a weekend or
 * a missing session doesn't make an intraday series look daily. Undefined for
 * fewer than two bars.
 */
export function barsAreDaily(data: ArrayLike<{ time: number }>): boolean | undefined {
  const n = Math.min(data.length, 64);
  if (n < 2) return undefined;
  const unit = barTimeUnit(data);
  let gap = Infinity;
  for (let i = 1; i < n; i++) {
    const d = Math.abs(data[i].time - data[i - 1].time) * unit;
    if (d > 0 && d < gap) gap = d;
  }
  return gap === Infinity ? undefined : gap >= DAILY_GAP_MS;
}

/** A short label like `UTC-5` or `UTC+5:30` for the offset in force at `atMs` (default: now). */
export function tzLabel(tz: TimeZoneSetting, atMs: number = Date.now()): string {
  const min = offsetAt(tz, atMs);
  const sign = min >= 0 ? '+' : '-';
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m === 0 ? `UTC${sign}${h}` : `UTC${sign}${h}:${String(m).padStart(2, '0')}`;
}

/** Day-of-week for a Monday-anchored reference week (1970-01-05 was a Monday, UTC). */
const WEEK_ANCHOR_MS = Date.UTC(1970, 0, 5);
const MINUTE_MS = UNIT_MS.m;
const DAY_MS = UNIT_MS.d;
const HOURS_PER_DAY = 24;

/** Where the buckets of `timeframeBucketStart` (and `resampleBars`) start. */
export interface BucketOptions {
  /** The day weeks start on: 0 Sunday, 1 Monday (the default). */
  weekStartsOn?: 0 | 1;
  /**
   * The zone whose midnight days start at: an IANA name such as
   * `'Asia/Ho_Chi_Minh'` (daylight saving time included), or minutes east of
   * UTC. Days, weeks, months and the hour frames that divide a day (2h, 3h,
   * 4h, 6h, 8h, 12h) follow it; 1h and shorter frames keep their epoch floor,
   * so the hour a fall-back night repeats stays two bars. Left out, UTC's.
   */
  timeZone?: string | number;
  /**
   * The times are bars a day long or more: one stamped at 00:00 UTC is the
   * date it names, and keeps that date's UTC bucket and stamp. Other times
   * are instants in `timeZone`.
   */
  dates?: boolean;
}

type ParsedFrame = { count: number; unit: TimeFrameUnit };
/** A frame that isn't one buckets as a minute, as it always has. */
const MINUTE_FRAME: ParsedFrame = { count: 1, unit: 'm' };
const PARSED_FRAMES_MAX = 256;
/** Bars are bucketed one by one: read each timeframe's text once, not once a bar. */
const parsedFrames = new Map<string, ParsedFrame>();

function parsedFrame(tf: TimeFrame): ParsedFrame {
  let frame = parsedFrames.get(tf);
  if (!frame) {
    frame = parseTimeframe(tf) ?? MINUTE_FRAME;
    if (parsedFrames.size >= PARSED_FRAMES_MAX) parsedFrames.clear();
    parsedFrames.set(tf, frame);
  }
  return frame;
}

/** Whether a frame's bars are a day long or more: days, weeks, months. */
function spansDays({ unit }: ParsedFrame): boolean {
  return unit === 'd' || unit === 'w' || unit === 'M';
}

/** Whether a frame's buckets start at a day's midnight: days, weeks, months, and hours that divide a day. */
function followsDays(frame: ParsedFrame): boolean {
  if (frame.unit === 'h') return frame.count > 1 && HOURS_PER_DAY % frame.count === 0;
  return spansDays(frame);
}

/** Whether `timeframeBucketStart` starts the buckets of `tf` at a zone's midnight when given one. */
export function timeframeFollowsDays(tf: TimeFrame): boolean {
  return followsDays(parsedFrame(tf));
}

/** Whether bars of `tf` are a day long or more (days, weeks, months), which feeds often stamp by date. */
export function timeframeSpansDays(tf: TimeFrame): boolean {
  return spansDays(parsedFrame(tf));
}

/** Whether `timeZone` moves a day's midnight away from UTC's. */
function isZoned(timeZone: string | number | undefined): timeZone is string | number {
  return timeZone !== undefined && !isUtcTimeZone(timeZone);
}

/**
 * Start of the bucket a timestamp falls into for a given timeframe.
 *
 * Minutes and hours floor to multiples of the frame since the Unix epoch.
 * Days, weeks (from Monday, or `weekStartsOn`), months, quarters and years
 * start at midnight, and the hour frames that divide a day (2h to 12h) count
 * from it: UTC's, or `timeZone`'s when given (a day the clocks change is 23
 * or 25 hours long, its 4h bucket 3 or 5). A 3M frame starts on quarters, a
 * 12M one on 1 January. The third argument may also be the day weeks start
 * on alone. Throws a RangeError for a zone the browser doesn't know.
 */
export function timeframeBucketStart(
  timestamp: number,
  tf: TimeFrame,
  options: 0 | 1 | BucketOptions = 1,
): number {
  const frame = parsedFrame(tf);
  const weekStartsOn = typeof options === 'number' ? options : options.weekStartsOn ?? 1;
  const timeZone = typeof options === 'number' ? undefined : options.timeZone;
  if (!isZoned(timeZone) || !followsDays(frame)) return utcBucketStart(timestamp, frame, weekStartsOn);
  // A date keeps the bucket of the day it names; only instants follow the zone.
  if (typeof options === 'object' && options.dates && timestamp % DAY_MS === 0) {
    return utcBucketStart(timestamp, frame, weekStartsOn);
  }
  // Bucket the zone's wall clock as if it were UTC, then find when that wall time happens there.
  const wall = timestamp + offsetAt(timeZone, timestamp) * MINUTE_MS;
  return wallToUtc(utcBucketStart(wall, frame, weekStartsOn), timeZone);
}

/** The bucket of `timestamp` on UTC's clock and calendar. */
function utcBucketStart(timestamp: number, { count, unit }: ParsedFrame, weekStartsOn: 0 | 1): number {
  if (unit === 's' || unit === 'm' || unit === 'h' || unit === 'd') {
    const ms = count * UNIT_MS[unit];
    return Math.floor(timestamp / ms) * ms;
  }

  const d = new Date(timestamp);

  if (unit === 'w') {
    const dow = d.getUTCDay();
    const shift = (dow - weekStartsOn + 7) % 7;
    const weekStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - shift);
    if (count <= 1) return weekStart;
    const weekIndex = Math.floor((weekStart - WEEK_ANCHOR_MS) / (7 * DAY_MS));
    const grouped = Math.floor(weekIndex / count) * count;
    return WEEK_ANCHOR_MS + grouped * 7 * DAY_MS;
  }

  // months / quarters / years
  const totalMonths = d.getUTCFullYear() * 12 + d.getUTCMonth();
  const grouped = Math.floor(totalMonths / count) * count;
  return Date.UTC(Math.floor(grouped / 12), grouped % 12, 1);
}

/**
 * The zone a bar a day long or more is dated in, whatever zone the chart
 * shows (`tz`): UTC for one stamped at 00:00 UTC, the date it names; its
 * exchange's zone (`exchangeZone`) for one stamped at the exchange's
 * midnight, as the days a chart builds are; else `tz`, so a bar stamped at
 * the browser's midnight still reads its own date there.
 */
export function barDateZone(timeMs: number, tz: TimeZoneSetting, exchangeZone?: string | null): TimeZoneSetting {
  if (timeMs % DAY_MS === 0) return 0;
  if (exchangeZone && timeframeBucketStart(timeMs, '1d', { timeZone: exchangeZone }) === timeMs) return exchangeZone;
  return tz;
}

/** The calendar parts a bar a day long or more is labelled with: its date, in the zone `barDateZone` gives. */
export function barDateParts(timeMs: number, tz: TimeZoneSetting, exchangeZone?: string | null): TimeParts {
  return timeParts(timeMs, barDateZone(timeMs, tz, exchangeZone));
}
