import type { SymbolInfo } from '@tradecanvas/commons';
import { isValidTimeZone, normalizeBarTime, sessionMinute } from '@tradecanvas/commons';
import { isRegularSession } from '@tradecanvas/core';

const DAY_MS = 86_400_000;
/** Bars looked at to tell the interval (a weekend gap between two of them doesn't fool it). */
const SPACING_SAMPLE = 10;

/**
 * Which bar times fall in `info`'s regular hours, for bars like `data`'s
 * (by the time each bar opens). Null when there is nothing to leave out:
 * the symbol has no hours or no zone, or the bars are a day or longer.
 */
export function regularHoursFilter(
  info: SymbolInfo | null,
  data: readonly { time: number }[],
): ((time: number) => boolean) | null {
  const zone = info?.timezone;
  if (!zone || !isValidTimeZone(zone) || data.length < 2) return null;
  const windows = (info?.sessions ?? []).flatMap((session) => {
    const startMinute = sessionMinute(session.start);
    const endMinute = sessionMinute(session.end);
    return startMinute === null || endMinute === null ? [] : [{ startMinute, endMinute }];
  });
  if (windows.length === 0) return null;
  let spacing = Infinity;
  for (let i = Math.max(1, data.length - SPACING_SAMPLE); i < data.length; i++) {
    const gap = normalizeBarTime(data[i].time) - normalizeBarTime(data[i - 1].time);
    if (gap > 0 && gap < spacing) spacing = gap;
  }
  if (!(spacing < DAY_MS)) return null;
  const config = { timeZone: zone, windows, startMinute: windows[0].startMinute, endMinute: windows[windows.length - 1].endMinute };
  return (time) => isRegularSession(normalizeBarTime(time), config);
}
