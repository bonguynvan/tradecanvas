import { describe, it, expect } from 'vitest';
import type { IndicatorValue, OHLCBar, TimeFrame } from '@tradecanvas/commons';
import { barsAreDaily, timeframeBucketStart, timeframeFollowsDays, zoneOffsetMinutes } from '@tradecanvas/commons';
import { periodKeyer, breaksBetween } from '../periods.js';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const at = (time: number): OHLCBar => ({ time, open: 1, high: 1, low: 1, close: 1, volume: 1 });
/** Bars at `times`, as a series to key. */
const series = (times: number[]): OHLCBar[] => times.map(at);
/** Hourly bars from `start`, `count` of them. */
const hours = (start: number, count: number): OHLCBar[] => Array.from({ length: count }, (_, i) => at(start + i * HOUR));

describe('periodKeyer', () => {
  it('keys an intraday bar by its day on the exchange’s clock', () => {
    // An ASX session, 10:00–15:00 in Sydney (UTC+11 on 26 October 2026): 23:00–04:00 UTC.
    const data = hours(Date.UTC(2026, 9, 25, 23), 6);
    const sydney = periodKeyer(data, 'session', 'Australia/Sydney');
    expect(new Set(data.map((b) => sydney(b.time)))).toEqual(new Set([Date.UTC(2026, 9, 26)]));
    // Without a zone, UTC's day: the 10:00 bar is the day before.
    const utc = periodKeyer(data, 'session', null);
    expect(utc(data[0].time)).toBe(Date.UTC(2026, 9, 25));
    expect(utc(data[1].time)).toBe(Date.UTC(2026, 9, 26));
  });

  it('keeps every hour of a 25-hour day in that day', () => {
    // New York's clocks go back on 1 November 2026: from 04:00 UTC (00:00 EDT) to 05:00 UTC the next day (00:00 EST).
    const data = hours(Date.UTC(2026, 10, 1, 4), 26);
    const key = periodKeyer(data, 'session', 'America/New_York');
    const keys = data.map((b) => key(b.time));
    expect(new Set(keys.slice(0, 25))).toEqual(new Set([Date.UTC(2026, 10, 1)]));
    expect(keys[25]).toBe(Date.UTC(2026, 10, 2));
  });

  it('reads a daily bar stamped at 00:00 UTC as the date it names', () => {
    // A west-of-UTC zone would put these at 20:00 the day before: Monday's bar would join last week.
    const data = series(Array.from({ length: 10 }, (_, d) => Date.UTC(2026, 9, 21) + d * DAY));
    const week = periodKeyer(data, 'week', 'America/New_York');
    const monday = Date.UTC(2026, 9, 26);
    expect(week(monday)).toBe(monday);
    expect(week(monday - DAY)).toBe(Date.UTC(2026, 9, 19));
  });

  it('reads a daily bar stamped at any other hour on the exchange’s clock', () => {
    // Daily bars stamped 00:00 in Ho Chi Minh City: 17:00 UTC the day before.
    const local = (m: number, d: number) => Date.UTC(2026, m, d) - 7 * HOUR;
    const data = series([local(10, 27), local(10, 30), local(11, 1), local(11, 2)]);
    const month = periodKeyer(data, 'month', 'Asia/Ho_Chi_Minh');
    expect(data.map((b) => month(b.time))).toEqual([Date.UTC(2026, 10, 1), Date.UTC(2026, 10, 1), Date.UTC(2026, 11, 1), Date.UTC(2026, 11, 1)]);
  });

  it('starts weeks on Monday and months on the 1st', () => {
    const data = series(Array.from({ length: 40 }, (_, d) => Date.UTC(2026, 9, 15) + d * DAY));
    const week = periodKeyer(data, 'week', null);
    const month = periodKeyer(data, 'month', null);
    expect(week(Date.UTC(2026, 9, 25))).toBe(Date.UTC(2026, 9, 19)); // a Sunday: the week from Monday 19th
    expect(week(Date.UTC(2026, 9, 26))).toBe(Date.UTC(2026, 9, 26));
    expect(month(Date.UTC(2026, 10, 30))).toBe(Date.UTC(2026, 10, 1));
    expect(month(Date.UTC(2026, 11, 1))).toBe(Date.UTC(2026, 11, 1));
  });

  it('reads bar times given in seconds', () => {
    const data = hours(Date.UTC(2026, 9, 19, 20), 8).map((b) => ({ ...b, time: b.time / 1000 }));
    const key = periodKeyer(data, 'session', null);
    expect(key(data[3].time)).toBe(Date.UTC(2026, 9, 19));
    expect(key(data[4].time)).toBe(Date.UTC(2026, 9, 20));
  });

  it('starts the hour frames that divide a day at the exchange’s midnight, and keeps shorter ones on the epoch', () => {
    // 09:30 in Ho Chi Minh City is 02:30 UTC: its 4h bar starts at 08:00 there.
    const data = hours(Date.UTC(2026, 9, 19, 2, 30), 3);
    expect(periodKeyer(data, '4h', 'Asia/Ho_Chi_Minh')(data[0].time)).toBe(Date.UTC(2026, 9, 19, 8));
    // Kolkata is UTC+5:30, but an hour bar still starts on the hour UTC.
    expect(periodKeyer(data, '1h', 'Asia/Kolkata')(data[0].time)).toBe(Date.UTC(2026, 9, 19, 2));
  });

  it('reads a zone the browser does not know as UTC, rather than throwing', () => {
    const data = hours(Date.UTC(2026, 9, 25, 23), 6);
    const unknown = periodKeyer(data, 'session', 'Mars/Olympus_Mons');
    const utc = periodKeyer(data, 'session', null);
    expect(data.map((b) => unknown(b.time))).toEqual(data.map((b) => utc(b.time)));
  });

  it('keeps a month whole where daily bars stamped at London’s midnight go from 23:00 to 00:00 UTC', () => {
    // 23:00 UTC the day before in summer time, 00:00 UTC (a date) once the clocks go back on 25 October 2026.
    const london = (m: number, d: number) => Date.UTC(2026, m, d) - (Date.UTC(2026, m, d) < Date.UTC(2026, 9, 25, 1) ? HOUR : 0);
    const days = [[8, 29], [8, 30], [9, 1], [9, 2], [9, 22], [9, 23], [9, 26], [9, 27], [9, 30], [10, 2], [10, 3]];
    const data = series(days.map(([m, d]) => london(m, d)));
    const month = periodKeyer(data, 'month', 'Europe/London');
    const keys = data.map((b) => month(b.time));
    expect(keys).toEqual(days.map(([m]) => Date.UTC(2026, m, 1)));
    // Asked in any order, a bar is in the same month.
    const backwards = periodKeyer(data, 'month', 'Europe/London');
    expect([...data].reverse().map((b) => backwards(b.time))).toEqual([...keys].reverse());
  });

  it('puts the 1st’s daily bar, stamped at London’s midnight, in the new month after dates in the old one', () => {
    // Summer time starts on 28 March 2027: 1 April's bar is stamped 23:00 UTC on 31 March, after bars stamped 00:00 UTC.
    const data = series([Date.UTC(2027, 2, 25), Date.UTC(2027, 2, 26), Date.UTC(2027, 2, 29) - HOUR, Date.UTC(2027, 2, 31) - HOUR, Date.UTC(2027, 3, 1) - HOUR]);
    const month = periodKeyer(data, 'month', 'Europe/London');
    const march = Date.UTC(2027, 2, 1);
    expect(data.map((b) => month(b.time))).toEqual([march, march, march, march, Date.UTC(2027, 3, 1)]);
  });

  it('gives each bar the period its time has on the exchange’s clock, across clock changes', () => {
    /** Read bar by bar: a date stays the date it names, an instant is read on the zone's clock. */
    const byClock = (data: OHLCBar[], ms: number, frame: TimeFrame, zone: string) => {
      const date = barsAreDaily(data) === true && ms % DAY === 0;
      const wall = date || !timeframeFollowsDays(frame) ? ms : ms + zoneOffsetMinutes(zone, ms) * 60_000;
      return timeframeBucketStart(wall, frame);
    };
    const zones = ['America/New_York', 'Europe/London', 'Europe/Berlin', 'Australia/Sydney', 'Pacific/Auckland', 'Asia/Kolkata', 'America/Havana', 'Australia/Lord_Howe'];
    // Half-hour bars through the clock changes of March, and of October and November 2026; daily bars stamped at 00:00 and at 23:00 UTC.
    const spans: OHLCBar[][] = [
      Array.from({ length: 48 * 40 }, (_, i) => at(Date.UTC(2026, 2, 1) + (i * HOUR) / 2)),
      Array.from({ length: 48 * 45 }, (_, i) => at(Date.UTC(2026, 8, 20) + (i * HOUR) / 2)),
      Array.from({ length: 400 }, (_, i) => at(Date.UTC(2026, 0, 1) + i * DAY - (i % 3 === 0 ? HOUR : 0))),
    ];
    for (const zone of zones) {
      for (const data of spans) {
        for (const frame of ['1d', '1w', '1M', '4h', '6h', '1h'] as TimeFrame[]) {
          const key = periodKeyer(data, frame, zone);
          expect(data.map((b) => key(b.time)), `${zone} ${frame}`).toEqual(data.map((b) => byClock(data, b.time, frame, zone)));
        }
      }
    }
  });

  it('gives the same key whatever order bars are asked in', () => {
    const data = hours(Date.UTC(2026, 9, 19), 24 * 40);
    const key = periodKeyer(data, 'month', 'America/New_York');
    const asked = [...data].reverse().map((b) => key(b.time));
    const fresh = [...data].reverse().map((b) => periodKeyer(data, 'month', 'America/New_York')(b.time));
    expect(asked).toEqual(fresh);
  });
});

describe('breaksBetween', () => {
  const tagged = (sessions: number[]): IndicatorValue[] => sessions.map((session) => ({ value: 1, session }));

  it('breaks where the period changes', () => {
    const s = tagged([1, 1, 2, 2]);
    expect(breaksBetween(s, 0, 1)).toBe(false);
    expect(breaksBetween(s, 1, 2)).toBe(true);
  });

  it('joins two periods of one bar each, as daily bars under a session make', () => {
    const s = tagged([1, 2, 3, 3]);
    expect(breaksBetween(s, 0, 1)).toBe(false);
    expect(breaksBetween(s, 1, 2)).toBe(true); // the period it reaches has more than one bar
  });

  it('never breaks a line with no periods', () => {
    expect(breaksBetween([{ value: 1 }, { value: 2 }], 0, 1)).toBe(false);
  });
});
