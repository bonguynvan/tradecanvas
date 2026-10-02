/**
 * The display timezone: an IANA name (`'America/New_York'`, `'UTC'`), a fixed
 * offset in minutes east of UTC (`-300`), or null for the browser's own zone.
 */
export type TimeZoneSetting = string | number | null;

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;
/** Zones change their offset on quarter hours, so it holds for each 15 minutes. */
const OFFSET_BUCKET_MS = 15 * MINUTE_MS;
const OFFSET_CACHE_MAX = 8192;
/**
 * Clocks change months apart, so a week whose offset is the same at both
 * ends holds it throughout: one lookup serves a week of bars.
 */
const WEEK_MS = 7 * DAY_MS;
const WEEK_CACHE_MAX = 4096;
/** Names of UTC itself: no lookup needed. */
const UTC_ZONES = new Set(['UTC', 'Etc/UTC', 'GMT', 'Etc/GMT', 'UCT', 'Etc/UCT', 'Universal', 'Etc/Universal', 'Zulu', 'Etc/Zulu']);

const zoneFormats = new Map<string, Intl.DateTimeFormat>();
const offsetCache = new Map<string, number>();
/** A week's offsets: `before` until the clocks change at `change`, then `after`. */
interface WeekOffsets {
  before: number;
  change: number;
  after: number;
}
/** Per zone, the offsets of each week looked at. */
const weekOffsets = new Map<string, Map<number, WeekOffsets>>();

function zoneFormat(zone: string): Intl.DateTimeFormat {
  let format = zoneFormats.get(zone);
  if (!format) {
    format = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    zoneFormats.set(zone, format);
  }
  return format;
}

/** Whether `zone` is a time zone this browser knows (an IANA name such as `'Europe/London'`). */
export function isValidTimeZone(zone: string): boolean {
  if (!zone) return false;
  try {
    zoneFormat(zone);
    return true;
  } catch {
    return false;
  }
}

/**
 * The zone's offset from UTC, in minutes east, at `timeMs` — daylight saving
 * time included. Throws a RangeError for a zone the browser doesn't know.
 */
export function zoneOffsetMinutes(zone: string, timeMs: number): number {
  if (!Number.isFinite(timeMs) || UTC_ZONES.has(zone)) return 0;
  let weeks = weekOffsets.get(zone);
  if (!weeks) {
    weeks = new Map();
    weekOffsets.set(zone, weeks);
  }
  const week = Math.floor(timeMs / WEEK_MS);
  let offsets = weeks.get(week);
  if (!offsets) {
    offsets = readWeek(zone, week * WEEK_MS);
    if (weeks.size >= WEEK_CACHE_MAX) weeks.clear();
    weeks.set(week, offsets);
  }
  return timeMs < offsets.change ? offsets.before : offsets.after;
}

/** The offsets of the week from `start`, and the quarter hour the clocks change in it, if they do. */
function readWeek(zone: string, start: number): WeekOffsets {
  const before = bucketOffset(zone, start);
  let last = start + WEEK_MS - OFFSET_BUCKET_MS;
  const after = bucketOffset(zone, last);
  if (after === before) return { before, change: Infinity, after };
  // Halve the week down to the first quarter hour on the new offset.
  let first = start;
  while (last - first > OFFSET_BUCKET_MS) {
    const mid = first + Math.floor((last - first) / OFFSET_BUCKET_MS / 2) * OFFSET_BUCKET_MS;
    if (bucketOffset(zone, mid) === before) first = mid;
    else last = mid;
  }
  return { before, change: last, after };
}

/** The zone's offset over the quarter hour holding `timeMs`. */
function bucketOffset(zone: string, timeMs: number): number {
  const bucket = Math.floor(timeMs / OFFSET_BUCKET_MS);
  const key = `${zone}|${bucket}`;
  const cached = offsetCache.get(key);
  if (cached !== undefined) return cached;

  const at = bucket * OFFSET_BUCKET_MS;
  let year = 1970, month = 1, day = 1, hour = 0, minute = 0, second = 0;
  for (const part of zoneFormat(zone).formatToParts(new Date(at))) {
    const value = Number(part.value);
    switch (part.type) {
      case 'year': year = value; break;
      case 'month': month = value; break;
      case 'day': day = value; break;
      case 'hour': hour = value % 24; break;
      case 'minute': minute = value; break;
      case 'second': second = value; break;
    }
  }
  const offset = Math.round((Date.UTC(year, month - 1, day, hour, minute, second) - at) / MINUTE_MS);
  if (offsetCache.size >= OFFSET_CACHE_MAX) offsetCache.clear();
  offsetCache.set(key, offset);
  return offset;
}

/** Minutes east of UTC at `timeMs` for any display timezone. */
export function offsetAt(tz: TimeZoneSetting, timeMs: number): number {
  if (tz === null) return -new Date(timeMs).getTimezoneOffset();
  if (typeof tz === 'number') return tz;
  return zoneOffsetMinutes(tz, timeMs);
}

/**
 * The instant whose wall clock in `tz` reads `wallMs` (a wall-clock time
 * written as if it were UTC, e.g. `Date.UTC(2026, 0, 15, 9, 30)`). A time
 * that occurs twice (clocks going back) is its first occurrence; a time a
 * spring-forward skips moves forward by the jump (02:30 → 03:30).
 */
export function wallToUtc(wallMs: number, tz: TimeZoneSetting): number {
  // The instant is within 14 hours of `wallMs`, so the offsets a day either
  // side bracket any clock change near it.
  const early = wallMs - offsetAt(tz, wallMs - DAY_MS) * MINUTE_MS;
  if (early + offsetAt(tz, early) * MINUTE_MS === wallMs) return early;
  const late = wallMs - offsetAt(tz, wallMs + DAY_MS) * MINUTE_MS;
  if (late + offsetAt(tz, late) * MINUTE_MS === wallMs) return late;
  return early; // skipped: read with the offset from before the jump
}

const dateFormatters = new Map<string, (ms: number) => string>();

/**
 * `Intl.DateTimeFormat#format` for dates in a display timezone, cached per
 * locale, options and zone (building a format costs ~40µs). A fixed offset
 * is applied by shifting the instant and formatting it as UTC.
 */
export function zonedDateFormatter(
  locale: string,
  options: Intl.DateTimeFormatOptions,
  tz: TimeZoneSetting,
): (ms: number) => string {
  const key = `${locale}|${JSON.stringify(options)}|${tz === null ? 'local' : typeof tz === 'number' ? `fixed:${tz}` : tz}`;
  let formatter = dateFormatters.get(key);
  if (formatter) return formatter;

  const timeZone = tz === null ? undefined : typeof tz === 'number' ? 'UTC' : tz;
  let format: Intl.DateTimeFormat;
  try {
    format = new Intl.DateTimeFormat(locale, { ...options, timeZone });
  } catch {
    format = new Intl.DateTimeFormat('en-US', { ...options, timeZone }); // unknown locale tag
  }
  const shift = typeof tz === 'number' ? tz * MINUTE_MS : 0;
  formatter = (ms) => format.format(new Date(ms + shift));
  dateFormatters.set(key, formatter);
  return formatter;
}
