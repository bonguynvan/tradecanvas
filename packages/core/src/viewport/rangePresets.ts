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

/** The same, on the browser's own calendar (daylight saving included). */
function addMonthsLocal(t: number, months: number): number {
  const d = new Date(t);
  const month = d.getMonth() + months;
  const lastDay = new Date(d.getFullYear(), month + 1, 0).getDate();
  return new Date(
    d.getFullYear(), month, Math.min(d.getDate(), lastDay),
    d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds(),
  ).getTime();
}

/**
 * Where the preset's span starts when it ends at `end` (ms): days are counted
 * back from `end`, months and YTD in calendar terms in the display timezone
 * (`tzOffsetMinutes` east of UTC; null = the browser's). Null for 'All'.
 */
export function rangePresetStart(preset: RangePreset, end: number, tzOffsetMinutes: number | null = 0): number | null {
  if (preset === 'All') return null;
  if (preset === '1D') return end - DAY_MS;
  if (preset === '5D') return end - 5 * DAY_MS;

  const months = PRESET_MONTHS[preset] ?? 0;
  if (tzOffsetMinutes === null) {
    // The browser's zone: its own calendar knows when the clocks change.
    if (preset === 'YTD') return new Date(new Date(end).getFullYear(), 0, 1).getTime();
    return addMonthsLocal(end, -months);
  }
  const offset = tzOffsetMinutes * MINUTE_MS;
  const wall = end + offset; // the display timezone's wall clock, as UTC
  if (preset === 'YTD') return Date.UTC(new Date(wall).getUTCFullYear(), 0, 1) - offset;
  return addMonthsUtc(wall, -months) - offset;
}
