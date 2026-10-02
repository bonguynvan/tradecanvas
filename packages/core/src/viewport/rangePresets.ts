import { offsetAt, wallToUtc, type TimeZoneSetting } from '@tradecanvas/commons';

/** Spans that end at the last bar, as on a chart's range bar. */
export type RangePreset = '1D' | '5D' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | '5Y' | 'All';

export const RANGE_PRESETS: readonly RangePreset[] = ['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y', '5Y', 'All'];

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;
const PRESET_MONTHS: Partial<Record<RangePreset, number>> = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12, '5Y': 60 };

/** `t` moved by `months` calendar months (UTC), the day clamped to the month's last. */
function addMonthsUtc(t: number, months: number): number {
  const d = new Date(t);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Date.UTC(
    year, month, Math.min(d.getUTCDate(), lastDay),
    d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds(),
  );
}

/**
 * Where the preset's span starts when it ends at `end` (ms): days are counted
 * back from `end`, months and YTD in calendar terms in the display timezone
 * (an IANA zone, minutes east of UTC, or null for the browser's), keeping the
 * wall-clock time across daylight-saving changes. Null for 'All'.
 */
export function rangePresetStart(preset: RangePreset, end: number, tz: TimeZoneSetting = 0): number | null {
  if (preset === 'All') return null;
  if (preset === '1D') return end - DAY_MS;
  if (preset === '5D') return end - 5 * DAY_MS;

  const wall = end + offsetAt(tz, end) * MINUTE_MS; // the zone's wall clock, as UTC
  if (preset === 'YTD') return wallToUtc(Date.UTC(new Date(wall).getUTCFullYear(), 0, 1), tz);
  return wallToUtc(addMonthsUtc(wall, -(PRESET_MONTHS[preset] ?? 0)), tz);
}
