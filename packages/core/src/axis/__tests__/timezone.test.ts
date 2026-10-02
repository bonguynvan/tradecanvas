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

  it('agrees with the zone at every quarter hour of a year', () => {
    const direct = (zone: string, ms: number) => {
      const p = Object.fromEntries(
        new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })
          .formatToParts(new Date(ms)).map((x) => [x.type, Number(x.value)]),
      );
      return Math.round((Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute) - ms) / 60_000);
    };
    for (const zone of [NY, 'Europe/London', 'Australia/Sydney', 'Pacific/Chatham']) {
      // Read backwards, so the order a cache fills in can't hide a wrong answer.
      for (let ms = Date.UTC(2027, 0, 1); ms >= Date.UTC(2026, 0, 1); ms -= 15 * 60_000) {
        if (zoneOffsetMinutes(zone, ms) !== direct(zone, ms)) {
          throw new Error(`${zone} at ${new Date(ms).toISOString()}: ${zoneOffsetMinutes(zone, ms)} vs ${direct(zone, ms)}`);
        }
      }
    }
  });

  it('reads UTC and its aliases as no offset', () => {
    for (const zone of ['UTC', 'Etc/UTC', 'GMT', 'Etc/GMT']) {
      expect(offsetAt(zone, Date.UTC(2026, 6, 15))).toBe(0);
    }
  });

  it('gives a time that is not a number no offset instead of throwing', () => {
    expect(zoneOffsetMinutes(NY, Number.NaN)).toBe(0);
    expect(() => timeParts(Number.NaN, NY)).not.toThrow();
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

describe('wallToUtc far east of UTC', () => {
  const AKL = 'Pacific/Auckland';

  it('takes the first of a time that occurs twice', () => {
    // 2026-04-05 03:00 NZDT → 02:00 NZST: 02:30 happens at +13, then at +12.
    expect(wallToUtc(Date.UTC(2026, 3, 5, 2, 30), AKL)).toBe(Date.UTC(2026, 3, 4, 13, 30));
  });

  it('moves a skipped time forward', () => {
    // 2026-09-27 02:00 NZST → 03:00 NZDT: 02:30 is read as 03:30 NZDT.
    expect(wallToUtc(Date.UTC(2026, 8, 27, 2, 30), AKL)).toBe(Date.UTC(2026, 8, 26, 14, 30));
  });

  it('turns ordinary times into instants at +12:45 and +13', () => {
    expect(wallToUtc(Date.UTC(2026, 0, 15, 9, 0), 'Pacific/Chatham')).toBe(Date.UTC(2026, 0, 14, 19, 15));
    expect(wallToUtc(Date.UTC(2026, 0, 15, 9, 0), 'Pacific/Apia')).toBe(Date.UTC(2026, 0, 14, 20, 0));
  });
});
