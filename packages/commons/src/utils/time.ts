import type { TimeFrame } from '../types/ohlc.js';

const TIMEFRAME_MS: Record<TimeFrame, number> = {
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

export function timeframeToMs(tf: TimeFrame): number {
  return TIMEFRAME_MS[tf];
}

export function formatTimestamp(timestamp: number, tf: TimeFrame): string {
  const d = new Date(timestamp);
  const ms = TIMEFRAME_MS[tf];
  if (ms >= 86_400_000) {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  if (ms >= 3_600_000) {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function alignToTimeframe(timestamp: number, tf: TimeFrame): number {
  const ms = TIMEFRAME_MS[tf];
  return Math.floor(timestamp / ms) * ms;
}

export interface TimeParts {
  month: number; // 1-12
  day: number;
  hours: number;
  minutes: number;
}

/**
 * Calendar parts of a timestamp in either the browser-local timezone
 * (`tzOffsetMinutes === null`) or a fixed UTC offset (e.g. -300 for EST).
 */
export function timeParts(timeMs: number, tzOffsetMinutes: number | null): TimeParts {
  if (tzOffsetMinutes === null) {
    const d = new Date(timeMs);
    return { month: d.getMonth() + 1, day: d.getDate(), hours: d.getHours(), minutes: d.getMinutes() };
  }
  const d = new Date(timeMs + tzOffsetMinutes * 60_000);
  return { month: d.getUTCMonth() + 1, day: d.getUTCDate(), hours: d.getUTCHours(), minutes: d.getUTCMinutes() };
}

/** A short timezone label like `UTC-5` or `UTC+5:30` (browser-local when null). */
export function tzLabel(tzOffsetMinutes: number | null): string {
  const min = tzOffsetMinutes === null ? -new Date().getTimezoneOffset() : tzOffsetMinutes;
  const sign = min >= 0 ? '+' : '-';
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m === 0 ? `UTC${sign}${h}` : `UTC${sign}${h}:${String(m).padStart(2, '0')}`;
}

/** Day-of-week for a Monday-anchored reference week (1970-01-05 was a Monday, UTC). */
const WEEK_ANCHOR_MS = Date.UTC(1970, 0, 5);

function parseTimeframe(tf: TimeFrame): { count: number; unit: 's' | 'm' | 'h' | 'd' | 'w' | 'M' } {
  const match = /^(\d+)([smhdwM])$/.exec(tf);
  if (!match) return { count: 1, unit: 'm' };
  return { count: parseInt(match[1], 10), unit: match[2] as 's' | 'm' | 'h' | 'd' | 'w' | 'M' };
}

/**
 * Start of the bucket a timestamp falls into for a given timeframe.
 *
 * Intraday and daily frames are anchored to the Unix epoch (UTC) via fixed-ms
 * flooring. Weekly frames are anchored to Monday (or `weekStartsOn`), monthly
 * and yearly frames use calendar boundaries (1st of month, Jan for years) so
 * 3M aligns to quarters and 12M to calendar years.
 */
export function timeframeBucketStart(
  timestamp: number,
  tf: TimeFrame,
  weekStartsOn: 0 | 1 = 1,
): number {
  const { count, unit } = parseTimeframe(tf);

  if (unit === 's' || unit === 'm' || unit === 'h' || unit === 'd') {
    const ms = TIMEFRAME_MS[tf];
    return Math.floor(timestamp / ms) * ms;
  }

  const d = new Date(timestamp);

  if (unit === 'w') {
    const dayMs = TIMEFRAME_MS['1d'];
    const dow = d.getUTCDay();
    const shift = (dow - weekStartsOn + 7) % 7;
    const weekStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - shift);
    if (count <= 1) return weekStart;
    const weekIndex = Math.floor((weekStart - WEEK_ANCHOR_MS) / (7 * dayMs));
    const grouped = Math.floor(weekIndex / count) * count;
    return WEEK_ANCHOR_MS + grouped * 7 * dayMs;
  }

  // months / quarters / years
  const totalMonths = d.getUTCFullYear() * 12 + d.getUTCMonth();
  const grouped = Math.floor(totalMonths / count) * count;
  return Date.UTC(Math.floor(grouped / 12), grouped % 12, 1);
}
