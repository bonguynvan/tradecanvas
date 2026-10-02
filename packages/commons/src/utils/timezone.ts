/**
 * The display timezone: an IANA name (`'America/New_York'`, `'UTC'`), a fixed
 * offset in minutes east of UTC (`-300`), or null for the browser's own zone.
 */
export type TimeZoneSetting = string | number | null;

const MINUTE_MS = 60_000;
const HALF_DAY_MS = 12 * 60 * MINUTE_MS;
/** Zones change their offset on quarter hours, so it holds for each 15 minutes. */
const OFFSET_BUCKET_MS = 15 * MINUTE_MS;
const OFFSET_CACHE_MAX = 8192;

const zoneFormats = new Map<string, Intl.DateTimeFormat>();
const offsetCache = new Map<string, number>();

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
  // The offsets in force half a day either side bracket any clock change.
  const early = wallMs - offsetAt(tz, wallMs - HALF_DAY_MS) * MINUTE_MS;
  if (early + offsetAt(tz, early) * MINUTE_MS === wallMs) return early;
  const late = wallMs - offsetAt(tz, wallMs + HALF_DAY_MS) * MINUTE_MS;
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
