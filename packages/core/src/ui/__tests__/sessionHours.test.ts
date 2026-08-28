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

describe('isRegularSession — split session (midday recess)', () => {
  // SET: 10:00–12:30 morning, 14:30–16:30 afternoon. UTC+7 → tz offset +420.
  // Test timestamps are Bangkok local, converted to UTC by subtracting 7h.
  const set = {
    startMinute: 10 * 60,
    endMinute: 16 * 60 + 30,
    tzOffsetMinutes: 7 * 60,
    windows: [
      { startMinute: 10 * 60, endMinute: 12 * 60 + 30 },
      { startMinute: 14 * 60 + 30, endMinute: 16 * 60 + 30 },
    ],
  };
  const bkk = (h: number, m: number) => Date.UTC(2023, 0, 3, h - 7, m, 0);

  it('is in-session inside either window', () => {
    expect(isRegularSession(bkk(10, 0), set)).toBe(true);   // morning open
    expect(isRegularSession(bkk(12, 29), set)).toBe(true);  // just before recess
    expect(isRegularSession(bkk(14, 30), set)).toBe(true);  // afternoon open
    expect(isRegularSession(bkk(16, 29), set)).toBe(true);  // just before close
  });

  it('dims the midday recess and the pre-/post-market span', () => {
    expect(isRegularSession(bkk(12, 30), set)).toBe(false); // recess start (end exclusive)
    expect(isRegularSession(bkk(13, 30), set)).toBe(false); // mid recess
    expect(isRegularSession(bkk(9, 30), set)).toBe(false);  // pre-market
    expect(isRegularSession(bkk(16, 30), set)).toBe(false); // close (end exclusive)
    expect(isRegularSession(bkk(18, 0), set)).toBe(false);  // after-hours
  });

  it('falls back to startMinute/endMinute when windows is empty', () => {
    const noWindows = { ...set, windows: [] };
    expect(isRegularSession(bkk(13, 30), noWindows)).toBe(true); // lunch now counts — single 10:00–16:30 window
  });

  it('supports a window that itself wraps midnight', () => {
    // Two windows: an evening block and an early-morning block on the next day.
    const cfg = {
      startMinute: 0,
      endMinute: 0,
      tzOffsetMinutes: 0,
      windows: [
        { startMinute: 22 * 60, endMinute: 2 * 60 }, // 22:00 → 02:00 wraps
        { startMinute: 9 * 60, endMinute: 11 * 60 },
      ],
    };
    expect(isRegularSession(at(23, 0), cfg)).toBe(true);  // inside the wrapping window
    expect(isRegularSession(at(1, 0), cfg)).toBe(true);   // still inside it, past midnight
    expect(isRegularSession(at(10, 0), cfg)).toBe(true);  // inside the plain window
    expect(isRegularSession(at(5, 0), cfg)).toBe(false);  // between windows
  });
});
