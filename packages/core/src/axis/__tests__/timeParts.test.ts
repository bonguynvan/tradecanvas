import { describe, it, expect } from 'vitest';
import { timeParts, tzLabel, isDateOnly } from '@tradecanvas/commons';

// 2023-03-15 18:30 UTC.
const t = Date.UTC(2023, 2, 15, 18, 30, 0);

describe('timeParts', () => {
  it('uses UTC parts at offset 0', () => {
    expect(timeParts(t, 0)).toEqual({ year: 2023, month: 3, day: 15, hours: 18, minutes: 30 });
  });

  it('applies a negative offset (EST), wrapping the day', () => {
    // 18:30 UTC − 5h = 13:30 same day.
    expect(timeParts(t, -300)).toEqual({ year: 2023, month: 3, day: 15, hours: 13, minutes: 30 });
    // 02:00 UTC − 5h = 21:00 previous day.
    const t2 = Date.UTC(2023, 2, 15, 2, 0, 0);
    expect(timeParts(t2, -300)).toEqual({ year: 2023, month: 3, day: 14, hours: 21, minutes: 0 });
  });

  it('applies a fractional positive offset (IST +5:30)', () => {
    // 18:30 UTC + 5:30 = 00:00 next day.
    expect(timeParts(t, 330)).toEqual({ year: 2023, month: 3, day: 16, hours: 0, minutes: 0 });
  });

  it('wraps the year at a Dec 31 -> Jan 1 offset boundary', () => {
    const nye = Date.UTC(2023, 11, 31, 23, 0, 0);
    // +2h crosses into the new year.
    expect(timeParts(nye, 120)).toEqual({ year: 2024, month: 1, day: 1, hours: 1, minutes: 0 });
  });
});

describe('isDateOnly', () => {
  it('is true at exactly midnight — a daily/weekly/monthly/yearly bar', () => {
    expect(isDateOnly({ hours: 0, minutes: 0 })).toBe(true);
  });

  it('is false for any other time of day', () => {
    expect(isDateOnly({ hours: 0, minutes: 1 })).toBe(false);
    expect(isDateOnly({ hours: 9, minutes: 0 })).toBe(false);
    expect(isDateOnly({ hours: 23, minutes: 59 })).toBe(false);
  });
});

describe('tzLabel', () => {
  it('formats whole-hour offsets', () => {
    expect(tzLabel(0)).toBe('UTC+0');
    expect(tzLabel(-300)).toBe('UTC-5');
    expect(tzLabel(540)).toBe('UTC+9');
  });

  it('formats fractional offsets', () => {
    expect(tzLabel(330)).toBe('UTC+5:30');
    expect(tzLabel(-210)).toBe('UTC-3:30');
  });
});
