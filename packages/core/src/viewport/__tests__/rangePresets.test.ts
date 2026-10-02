import { describe, it, expect } from 'vitest';
import { rangePresetStart } from '../rangePresets.js';

const utc = (y: number, m: number, d: number, h = 0, min = 0) => Date.UTC(y, m - 1, d, h, min);

describe('rangePresetStart', () => {
  const end = utc(2026, 3, 31, 15, 30);

  it('counts days back from the end', () => {
    expect(rangePresetStart('1D', end)).toBe(utc(2026, 3, 30, 15, 30));
    expect(rangePresetStart('5D', end)).toBe(utc(2026, 3, 26, 15, 30));
  });

  it('counts calendar months, clamping to the shorter month', () => {
    expect(rangePresetStart('1M', end)).toBe(utc(2026, 2, 28, 15, 30));
    expect(rangePresetStart('3M', end)).toBe(utc(2025, 12, 31, 15, 30));
    expect(rangePresetStart('6M', end)).toBe(utc(2025, 9, 30, 15, 30));
    expect(rangePresetStart('1Y', end)).toBe(utc(2025, 3, 31, 15, 30));
    expect(rangePresetStart('5Y', utc(2028, 2, 29))).toBe(utc(2023, 2, 28));
  });

  it('starts YTD on 1 January in the display timezone', () => {
    expect(rangePresetStart('YTD', end, 0)).toBe(utc(2026, 1, 1));
    // UTC+7: 1 January 00:00 there is 31 December 17:00 UTC.
    expect(rangePresetStart('YTD', end, 420)).toBe(utc(2025, 12, 31, 17));
    // Just after midnight on 1 January in UTC+7 is still last year in UTC.
    expect(rangePresetStart('YTD', utc(2025, 12, 31, 17, 30), 420)).toBe(utc(2025, 12, 31, 17));
  });

  it('measures months on the display timezone calendar', () => {
    // 1 March 02:00 in UTC+7 (28 Feb 19:00 UTC) minus a month is 1 February 02:00 there.
    expect(rangePresetStart('1M', utc(2026, 2, 28, 19), 420)).toBe(utc(2026, 1, 31, 19));
  });

  it('uses the browser calendar when no timezone is set', () => {
    const local = new Date(2026, 6, 15, 9, 30).getTime(); // 15 July, 09:30 local
    expect(rangePresetStart('YTD', local, null)).toBe(new Date(2026, 0, 1).getTime());
    // Across a daylight-saving change the wall-clock time is kept.
    expect(rangePresetStart('6M', local, null)).toBe(new Date(2026, 0, 15, 9, 30).getTime());
  });

  it('has no start for All', () => {
    expect(rangePresetStart('All', end)).toBeNull();
  });
});
