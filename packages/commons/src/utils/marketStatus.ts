import type { SymbolInfo } from '../types/symbol.js';
import { sessionMinute } from './symbols.js';
import { isValidTimeZone, zoneOffsetMinutes } from './timezone.js';

/** Whether a symbol's market is trading now, and when that changes. */
export interface MarketStatus {
  /** `'always'`: no hours known (24/7, such as crypto). */
  state: 'open' | 'closed' | 'always';
  /** When it next closes (open) or opens (closed), in ms; null when unknown. */
  next: number | null;
}

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;
/** Days looked ahead for the next open (a long weekend, a week of holidays). */
const LOOK_AHEAD_DAYS = 8;

/**
 * The market status of `info` at `now`: in a session of its hours (in its
 * exchange's time zone, clocks changes included) or not, and when that
 * changes. Sessions that meet count as one; a session past midnight belongs
 * to the day it starts. Without hours or a zone it knows: `'always'`.
 */
export function marketStatus(info: SymbolInfo | null | undefined, now: number): MarketStatus {
  const zone = info?.timezone;
  const sessions = (info?.sessions ?? []).flatMap((s) => {
    const start = sessionMinute(s.start);
    const end = sessionMinute(s.end);
    if (start === null || end === null || start === end) return [];
    return [{ start, end, days: Array.isArray(s.days) ? s.days : null }];
  });
  if (!zone || !isValidTimeZone(zone) || sessions.length === 0 || !Number.isFinite(now)) {
    return { state: 'always', next: null };
  }

  const offset = zoneOffsetMinutes(zone, now) * MINUTE_MS;
  const today = Math.floor((now + offset) / DAY_MS) * DAY_MS;
  // A wall-clock time in the zone, back to UTC with the offset that holds then.
  const toUtc = (local: number) => local - zoneOffsetMinutes(zone, local - offset) * MINUTE_MS;

  const spans: [number, number][] = [];
  for (let d = -1; d <= LOOK_AHEAD_DAYS; d++) {
    const dayStart = today + d * DAY_MS;
    const weekday = (Math.floor(dayStart / DAY_MS) + 4) % 7; // 1 Jan 1970 was a Thursday
    for (const s of sessions) {
      if (s.days && !s.days.includes(weekday)) continue;
      const start = dayStart + s.start * MINUTE_MS;
      const end = (s.end > s.start ? dayStart : dayStart + DAY_MS) + s.end * MINUTE_MS;
      spans.push([toUtc(start), toUtc(end)]);
    }
  }
  spans.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [start, end] of spans) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) merged[merged.length - 1] = [last[0], Math.max(last[1], end)];
    else merged.push([start, end]);
  }

  const current = merged.find(([start, end]) => start <= now && now < end);
  if (current) return { state: 'open', next: current[1] };
  const upcoming = merged.find(([start]) => start > now);
  return { state: 'closed', next: upcoming ? upcoming[0] : null };
}
