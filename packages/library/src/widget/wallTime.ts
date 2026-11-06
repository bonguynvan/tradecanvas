import { timeParts, wallToUtc, type TimeZoneSetting } from '@tradecanvas/commons';

/** Dates and times on the wall clock of the display timezone: the go-to-date dialog's fields, a grid's linked dates. */

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{2}):(\d{2})$/;

/**
 * A wall-clock date ("2026-03-01") and time ("14:30", empty = midnight) in the
 * display timezone (an IANA zone, minutes east of UTC, or null for the
 * browser's) as a UTC timestamp. Null when the date or time is not valid.
 */
export function wallTimeToUtc(date: string, time: string, tz: TimeZoneSetting): number | null {
  const d = DATE_RE.exec(date);
  const t = time ? TIME_RE.exec(time) : ['', '00', '00'];
  if (!d || !t) return null;
  const [year, month, day, hours, minutes] = [+d[1], +d[2], +d[3], +t[1], +t[2]];
  if (month < 1 || month > 12 || day < 1 || day > 31 || hours > 23 || minutes > 59) return null;
  const wall = Date.UTC(year, month - 1, day, hours, minutes);
  if (new Date(wall).getUTCDate() !== day) return null; // 31 February rolls over: reject
  return wallToUtc(wall, tz);
}

/** The date and time fields' values for `ts` in the display timezone. */
export function utcToWallTime(ts: number, tz: TimeZoneSetting): WallTime {
  const pad = (n: number) => String(n).padStart(2, '0');
  const p = timeParts(ts, tz);
  return {
    date: `${p.year}-${pad(p.month)}-${pad(p.day)}`,
    time: `${pad(p.hours)}:${pad(p.minutes)}`,
  };
}

/** A date (YYYY-MM-DD) and a time (HH:MM, or empty for the day's start) on the wall clock. */
export interface WallTime {
  date: string;
  time: string;
}
