import { describe, it, expect } from 'vitest';
import {
  isValidTimeZone,
  zoneOffsetMinutes,
  offsetAt,
  wallToUtc,
  timeParts,
  tzLabel,
  zonedDateFormatter,
} from '@tradecanvas/commons';

const NY = 'America/New_York';

describe('zoneOffsetMinutes', () => {
  it('follows daylight saving time', () => {
    expect(zoneOffsetMinutes(NY, Date.UTC(2026, 0, 15, 12))).toBe(-300);
    expect(zoneOffsetMinutes(NY, Date.UTC(2026, 6, 15, 12))).toBe(-240);
    expect(zoneOffsetMinutes('Asia/Ho_Chi_Minh', Date.UTC(2026, 6, 15))).toBe(420);
    expect(zoneOffsetMinutes('Asia/Kolkata', Date.UTC(2026, 6, 15))).toBe(330);
    expect(zoneOffsetMinutes('UTC', Date.UTC(2026, 6, 15))).toBe(0);
  });

  it('switches at the exact instant the clocks change', () => {
    // 2026-03-08 02:00 EST = 07:00 UTC: clocks jump to 03:00 EDT.
    expect(zoneOffsetMinutes(NY, Date.UTC(2026, 2, 8, 6, 59))).toBe(-300);
    expect(zoneOffsetMinutes(NY, Date.UTC(2026, 2, 8, 7, 0))).toBe(-240);
  });
});

describe('isValidTimeZone', () => {
  it('accepts IANA names and rejects anything else', () => {
    expect(isValidTimeZone(NY)).toBe(true);
    expect(isValidTimeZone('UTC')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
    expect(isValidTimeZone('')).toBe(false);
  });
});

describe('offsetAt', () => {
  it('reads a zone, a fixed offset or the browser’s zone', () => {
    const t = Date.UTC(2026, 6, 15);
    expect(offsetAt(NY, t)).toBe(-240);
    expect(offsetAt(-300, t)).toBe(-300);
    expect(offsetAt(null, t)).toBe(-new Date(t).getTimezoneOffset());
  });
});

describe('wallToUtc', () => {
  it('turns a wall-clock time in a zone into an instant', () => {
    expect(wallToUtc(Date.UTC(2026, 0, 15, 9, 30), NY)).toBe(Date.UTC(2026, 0, 15, 14, 30));
    expect(wallToUtc(Date.UTC(2026, 6, 15, 9, 30), NY)).toBe(Date.UTC(2026, 6, 15, 13, 30));
    expect(wallToUtc(Date.UTC(2026, 6, 15, 9, 30), 420)).toBe(Date.UTC(2026, 6, 15, 2, 30));
  });

  it('maps a time skipped by spring-forward to the same clock reading after the jump', () => {
    // 02:30 doesn't exist on 2026-03-08 in New York; it lands an hour on, at 03:30 EDT.
    expect(wallToUtc(Date.UTC(2026, 2, 8, 2, 30), NY)).toBe(Date.UTC(2026, 2, 8, 7, 30));
  });
});

describe('timeParts and tzLabel with a zone', () => {
  it('reads the wall clock in the zone on either side of a change', () => {
    expect(timeParts(Date.UTC(2026, 2, 8, 6, 59), NY)).toMatchObject({ day: 8, hours: 1, minutes: 59 });
    expect(timeParts(Date.UTC(2026, 2, 8, 7, 0), NY)).toMatchObject({ day: 8, hours: 3, minutes: 0 });
  });

  it('labels the offset in force at a given time', () => {
    expect(tzLabel(NY, Date.UTC(2026, 0, 15))).toBe('UTC-5');
    expect(tzLabel(NY, Date.UTC(2026, 6, 15))).toBe('UTC-4');
    expect(tzLabel(330)).toBe('UTC+5:30');
  });
});

describe('zonedDateFormatter', () => {
  it('formats the calendar date in the zone', () => {
    // 03:00 UTC on the 2nd is still the 1st in New York.
    const t = Date.UTC(2026, 6, 2, 3);
    expect(zonedDateFormatter('en-US', { month: 'short', day: 'numeric' }, NY)(t)).toBe('Jul 1');
    expect(zonedDateFormatter('en-US', { month: 'short', day: 'numeric' }, 0)(t)).toBe('Jul 2');
    expect(zonedDateFormatter('en-US', { month: 'short', day: 'numeric' }, -300)(t)).toBe('Jul 1');
  });

  it('reuses one formatter per locale, options and zone', () => {
    const a = zonedDateFormatter('en-US', { month: 'short' }, NY);
    const b = zonedDateFormatter('en-US', { month: 'short' }, NY);
    expect(a).toBe(b);
  });
});

describe('wallToUtc when the clocks go back', () => {
  it('takes the first of a time that occurs twice', () => {
    // 2026-11-01 01:30 happens at 05:30 UTC (EDT) and again at 06:30 UTC (EST).
    expect(wallToUtc(Date.UTC(2026, 10, 1, 1, 30), NY)).toBe(Date.UTC(2026, 10, 1, 5, 30));
  });
});
