import { describe, it, expect } from 'vitest';
import { minuteOfDay, isRegularSession } from '../sessionHours.js';

// 2023-01-03 14:30 UTC = 09:30 EST (offset -300).
const at = (h: number, m: number) => Date.UTC(2023, 0, 3, h, m, 0);

describe('minuteOfDay', () => {
  it('derives minute-of-day in UTC', () => {
    expect(minuteOfDay(at(14, 30), 0)).toBe(14 * 60 + 30);
    expect(minuteOfDay(at(0, 0), 0)).toBe(0);
  });

  it('applies a negative tz offset, wrapping across midnight', () => {
    // 00:30 UTC with -300 offset → 19:30 the previous day.
    expect(minuteOfDay(at(0, 30), -300)).toBe(19 * 60 + 30);
  });
});

describe('isRegularSession', () => {
  const rth = { startMinute: 9 * 60 + 30, endMinute: 16 * 60, tzOffsetMinutes: -300 }; // 09:30–16:00 ET

  it('includes bars within the session', () => {
    expect(isRegularSession(at(14, 30), rth)).toBe(true); // 09:30 ET
    expect(isRegularSession(at(20, 59), rth)).toBe(true); // 15:59 ET
  });

  it('excludes pre/post-market bars', () => {
    expect(isRegularSession(at(13, 0), rth)).toBe(false);  // 08:00 ET pre-market
    expect(isRegularSession(at(21, 0), rth)).toBe(false);  // 16:00 ET (end exclusive)
    expect(isRegularSession(at(23, 0), rth)).toBe(false);  // 18:00 ET after-hours
  });

  it('treats start === end as a 24h session', () => {
    expect(isRegularSession(at(3, 0), { startMinute: 0, endMinute: 0, tzOffsetMinutes: 0 })).toBe(true);
  });

  it('handles an overnight session that wraps midnight', () => {
    // Futures-style 18:00–17:00 next day (UTC for simplicity).
    const overnight = { startMinute: 18 * 60, endMinute: 17 * 60, tzOffsetMinutes: 0 };
    expect(isRegularSession(at(20, 0), overnight)).toBe(true);  // 20:00 in-session
    expect(isRegularSession(at(2, 0), overnight)).toBe(true);   // 02:00 still in-session
    expect(isRegularSession(at(17, 30), overnight)).toBe(false); // 17:30 the daily break
  });
});
