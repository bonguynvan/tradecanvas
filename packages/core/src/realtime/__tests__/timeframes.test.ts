import { describe, it, expect } from 'vitest';
import type { OHLCBar, TimeFrame } from '@tradecanvas/commons';
import {
  parseTimeframe,
  isTimeFrame,
  timeframeToMs,
  timeframeBucketStart,
  resampleBars,
  pickBaseTimeframe,
  wallToUtc,
  barDateParts,
  timeframeSpansDays,
} from '@tradecanvas/commons';

const MIN = 60_000;

describe('parseTimeframe', () => {
  it('reads a count and a unit', () => {
    expect(parseTimeframe('7m')).toEqual({ count: 7, unit: 'm' });
    expect(parseTimeframe('90m')).toEqual({ count: 90, unit: 'm' });
    expect(parseTimeframe('3M')).toEqual({ count: 3, unit: 'M' });
    expect(parseTimeframe('15s')).toEqual({ count: 15, unit: 's' });
  });

  it.each(['', 'm', '0m', '-3m', '1.5m', '7x', ' 7m', '7m ', '1e3m', '07m'])('rejects %j', (value) => {
    expect(parseTimeframe(value)).toBeNull();
    expect(isTimeFrame(value)).toBe(false);
  });
});

describe('timeframeToMs', () => {
  it('handles any count of a unit', () => {
    expect(timeframeToMs('7m')).toBe(7 * MIN);
    expect(timeframeToMs('90m')).toBe(90 * MIN);
    expect(timeframeToMs('5d')).toBe(5 * 86_400_000);
  });

  it('keeps the values of the built-in timeframes', () => {
    expect(timeframeToMs('1M')).toBe(2_592_000_000);
    expect(timeframeToMs('12M')).toBe(31_536_000_000);
  });

  it('is NaN for something that is not a timeframe', () => {
    expect(timeframeToMs('7x' as TimeFrame)).toBeNaN();
  });
});

describe('timeframeBucketStart with custom timeframes', () => {
  it('floors to multiples of the timeframe since the epoch', () => {
    expect(timeframeBucketStart(20 * MIN + 5_000, '7m')).toBe(14 * MIN);
    expect(timeframeBucketStart(181 * MIN, '90m')).toBe(180 * MIN);
  });

  it('groups months into calendar spans', () => {
    // 2025-05-10 lands in the May–June pair of a 2-month frame.
    expect(timeframeBucketStart(Date.UTC(2025, 4, 10), '2M')).toBe(Date.UTC(2025, 4, 1));
  });
});

const bar = (time: number, open: number, high: number, low: number, close: number, volume = 1): OHLCBar =>
  ({ time, open, high, low, close, volume });

describe('resampleBars', () => {
  it('merges bars per bucket: first open, extremes, last close, summed volume', () => {
    const bars = [
      bar(0, 10, 11, 9, 10.5, 1),
      bar(MIN, 10.5, 12, 10, 11, 2),
      bar(2 * MIN, 11, 11.5, 8, 9, 3),
      bar(3 * MIN, 9, 10, 9, 9.5, 4),
    ];
    expect(resampleBars(bars, '3m')).toEqual([
      bar(0, 10, 12, 8, 9, 6),
      bar(3 * MIN, 9, 10, 9, 9.5, 4),
    ]);
  });

  it('returns an empty series for no bars', () => {
    expect(resampleBars([], '7m')).toEqual([]);
  });
});

describe('pickBaseTimeframe', () => {
  const binance: TimeFrame[] = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'];

  it.each([
    ['7m', '1m'],
    ['10m', '5m'],
    ['45m', '15m'],
    ['90m', '30m'],
    ['3h', '1h'],
    ['2d', '1d'],
    ['6d', '1d'],
    ['2w', '1w'],
    ['3M', '1M'],
    ['12M', '1M'],
  ] as [TimeFrame, TimeFrame][])('builds %s from %s', (target, base) => {
    expect(pickBaseTimeframe(target, binance)).toBe(base);
  });

  it('builds weeks and months from days when that is the closest', () => {
    expect(pickBaseTimeframe('1w', ['1m', '1h', '1d'])).toBe('1d');
    expect(pickBaseTimeframe('2M', ['1h', '1d'])).toBe('1d');
  });

  it('never builds from bars of several days, which feeds start on different days', () => {
    expect(pickBaseTimeframe('6d', ['3d'])).toBeNull();
  });

  it('never builds a month from bars that can straddle a month boundary', () => {
    expect(pickBaseTimeframe('1M', ['3d'])).toBeNull();
    expect(pickBaseTimeframe('1w', ['3d'])).toBeNull();
  });

  it('is null when no supported timeframe divides the target', () => {
    expect(pickBaseTimeframe('7m', ['5m', '15m'])).toBeNull();
    expect(pickBaseTimeframe('30s', ['1m'])).toBeNull();
  });
});

const VN = 'Asia/Ho_Chi_Minh';
const NY = 'America/New_York';

describe('timeframeBucketStart in a time zone', () => {
  // Friday 23 October 2026, 09:15 in Ho Chi Minh City (UTC+7).
  const t = Date.UTC(2026, 9, 23, 2, 15);

  it('starts a day at the zone’s midnight', () => {
    expect(timeframeBucketStart(t, '1d', { timeZone: VN })).toBe(Date.UTC(2026, 9, 22, 17));
  });

  it('starts the hour frames that divide a day at the zone’s midnight', () => {
    expect(timeframeBucketStart(t, '4h', { timeZone: VN })).toBe(Date.UTC(2026, 9, 23, 1)); // 08:00
    expect(timeframeBucketStart(Date.UTC(2026, 9, 23, 6, 5), '4h', { timeZone: VN })).toBe(Date.UTC(2026, 9, 23, 5)); // 12:00
  });

  it('starts weeks and months at the zone’s midnight', () => {
    expect(timeframeBucketStart(t, '1w', { timeZone: VN })).toBe(Date.UTC(2026, 9, 18, 17)); // Monday 19 October
    // 1 October, 03:00 there, is still 30 September in UTC.
    expect(timeframeBucketStart(Date.UTC(2026, 8, 30, 20), '1M', { timeZone: VN })).toBe(Date.UTC(2026, 8, 30, 17));
  });

  it('takes a fixed offset in minutes east of UTC', () => {
    for (const tf of ['4h', '1d', '1w', '1M'] as TimeFrame[]) {
      expect(timeframeBucketStart(t, tf, { timeZone: 420 })).toBe(timeframeBucketStart(t, tf, { timeZone: VN }));
    }
  });

  it('keeps the epoch floor for hours and minutes', () => {
    expect(timeframeBucketStart(t, '1h', { timeZone: VN })).toBe(Date.UTC(2026, 9, 23, 2));
    expect(timeframeBucketStart(t, '15m', { timeZone: VN })).toBe(t);
    expect(timeframeBucketStart(t, '5h', { timeZone: VN })).toBe(timeframeBucketStart(t, '5h'));
  });

  it('refuses a zone the browser does not know', () => {
    expect(() => timeframeBucketStart(t, '1d', { timeZone: 'Mars/Olympus' })).toThrow(RangeError);
  });
});

describe('timeframeBucketStart in New York, across both daylight saving changes', () => {
  it('starts each day at midnight there, at UTC-4 and then at UTC-5', () => {
    expect(timeframeBucketStart(Date.UTC(2026, 9, 30, 23, 30), '1d', { timeZone: NY })).toBe(Date.UTC(2026, 9, 30, 4));
    expect(timeframeBucketStart(Date.UTC(2026, 10, 3, 0, 30), '1d', { timeZone: NY })).toBe(Date.UTC(2026, 10, 2, 5));
  });

  it('starts the day the clocks go forward, and the next, at 00:00 there', () => {
    expect(timeframeBucketStart(Date.UTC(2026, 2, 8, 12), '1d', { timeZone: NY })).toBe(Date.UTC(2026, 2, 8, 5));
    expect(timeframeBucketStart(Date.UTC(2026, 2, 9, 12), '1d', { timeZone: NY })).toBe(Date.UTC(2026, 2, 9, 4));
  });

  it('puts 15:59 in the 12:00 bucket of a 4h frame on both days', () => {
    expect(timeframeBucketStart(Date.UTC(2026, 2, 8, 19, 59), '4h', { timeZone: NY })).toBe(Date.UTC(2026, 2, 8, 16));
    expect(timeframeBucketStart(Date.UTC(2026, 2, 9, 19, 59), '4h', { timeZone: NY })).toBe(Date.UTC(2026, 2, 9, 16));
  });

  it('starts a 2h bucket the clocks skip into at the hour after the jump', () => {
    // 03:30 on 8 March: its bucket would start at 02:00, which never happens there.
    expect(timeframeBucketStart(Date.UTC(2026, 2, 8, 7, 30), '2h', { timeZone: NY })).toBe(Date.UTC(2026, 2, 8, 7));
  });

  it('keeps both 01:30s of the night the clocks go back in one 4h bucket, and in two 1h ones', () => {
    const first = Date.UTC(2026, 10, 1, 5, 30);
    const second = Date.UTC(2026, 10, 1, 6, 30);
    expect(timeframeBucketStart(first, '4h', { timeZone: NY })).toBe(Date.UTC(2026, 10, 1, 4));
    expect(timeframeBucketStart(second, '4h', { timeZone: NY })).toBe(Date.UTC(2026, 10, 1, 4));
    expect(timeframeBucketStart(first, '1h', { timeZone: NY })).toBe(Date.UTC(2026, 10, 1, 5));
    expect(timeframeBucketStart(second, '1h', { timeZone: NY })).toBe(Date.UTC(2026, 10, 1, 6));
  });
});

describe('timeframeBucketStart with dates', () => {
  it('keeps a bar stamped at 00:00 UTC in the bucket of the date it names', () => {
    // Monday 26 October, stamped at 00:00 UTC: Sunday 20:00 in New York, read as a date.
    const monday = Date.UTC(2026, 9, 26);
    expect(timeframeBucketStart(monday, '1w', { timeZone: NY, dates: true })).toBe(monday);
    expect(timeframeBucketStart(monday, '1w', { timeZone: NY })).toBe(Date.UTC(2026, 9, 19, 4));
  });

  it('reads any other time as an instant in the zone', () => {
    // A Vietnamese daily bar stamped at the exchange's midnight (17:00 UTC the day before).
    expect(timeframeBucketStart(Date.UTC(2026, 9, 18, 17), '1w', { timeZone: VN, dates: true })).toBe(Date.UTC(2026, 9, 18, 17));
  });
});

describe('timeframeBucketStart without a zone', () => {
  const frames: TimeFrame[] = ['1m', '7m', '1h', '4h', '1d', '3d', '1w', '2w', '1M', '3M'];
  const times = [Date.UTC(2026, 9, 23, 2, 15), Date.UTC(2026, 10, 1, 5, 30), Date.UTC(2025, 0, 1), Date.UTC(1999, 11, 31, 23, 59)];

  it('is today’s bucketing when no zone is given, or UTC', () => {
    for (const tf of frames) {
      for (const t of times) {
        const today = timeframeBucketStart(t, tf);
        expect(timeframeBucketStart(t, tf, {})).toBe(today);
        expect(timeframeBucketStart(t, tf, { timeZone: 'UTC' })).toBe(today);
        expect(timeframeBucketStart(t, tf, { timeZone: 0 })).toBe(today);
      }
    }
  });

  it('still takes the day weeks start on as the third argument', () => {
    const wednesday = Date.UTC(2023, 0, 4, 12);
    expect(timeframeBucketStart(wednesday, '1w', 0)).toBe(Date.UTC(2023, 0, 1));
    expect(timeframeBucketStart(wednesday, '1w', { weekStartsOn: 0 })).toBe(Date.UTC(2023, 0, 1));
    expect(timeframeBucketStart(wednesday, '1w', { weekStartsOn: 0, timeZone: NY })).toBe(Date.UTC(2023, 0, 1, 5));
  });
});

/** One bar an hour, of volume 1, from `fromHour` to before `toHour` on each day, in `zone`'s wall time. */
function sessionHours(zone: string, days: [number, number, number][], fromHour: number, toHour: number): OHLCBar[] {
  const out: OHLCBar[] = [];
  for (const [y, m, d] of days) {
    for (let h = fromHour; h < toHour; h++) out.push(bar(wallToUtc(Date.UTC(y, m, d, h), zone), 1, 2, 0.5, 1.5, 1));
  }
  return out;
}

const volumes = (bars: OHLCBar[]) => bars.map((b) => b.volume);

describe('resampleBars in a time zone', () => {
  it('keeps a New York day from 04:00 to 20:00 whole after the clocks go back', () => {
    const hours = sessionHours(NY, [[2026, 9, 30], [2026, 10, 2]], 4, 20);
    expect(volumes(resampleBars(hours, '1d', { timeZone: NY }))).toEqual([16, 16]);
  });

  it('keeps a Sydney session whole, though it starts the UTC day before', () => {
    const hours = sessionHours('Australia/Sydney', [[2026, 9, 22], [2026, 9, 23]], 10, 16);
    const days = resampleBars(hours, '1d', { timeZone: 'Australia/Sydney' });
    expect(volumes(days)).toEqual([6, 6]);
    expect(days[0].time).toBe(Date.UTC(2026, 9, 21, 13));
  });

  it('builds weeks from daily bars stamped at 00:00 UTC by their dates, and keeps the stamps', () => {
    const dates = [19, 20, 21, 22, 23, 26, 27, 28, 29, 30].map((d) => bar(Date.UTC(2026, 9, d), 1, 2, 0.5, 1.5, 1));
    const weeks = resampleBars(dates, '1w', { timeZone: NY });
    expect(volumes(weeks)).toEqual([5, 5]);
    expect(weeks.map((w) => w.time)).toEqual([Date.UTC(2026, 9, 19), Date.UTC(2026, 9, 26)]);
  });

  it('builds weeks from daily bars stamped at the exchange’s midnight', () => {
    const days = [19, 20, 21, 22, 23, 26].map((d) => bar(wallToUtc(Date.UTC(2026, 9, d), VN), 1, 2, 0.5, 1.5, 1));
    const weeks = resampleBars(days, '1w', { timeZone: VN });
    expect(volumes(weeks)).toEqual([5, 1]);
    expect(weeks[0].time).toBe(Date.UTC(2026, 9, 18, 17));
  });

  it('is today’s result without a zone', () => {
    const hours = sessionHours(NY, [[2026, 9, 30], [2026, 10, 2]], 4, 20);
    expect(resampleBars(hours, '1d', {})).toEqual(resampleBars(hours, '1d'));
    expect(resampleBars(hours, '1d', { timeZone: 'UTC' })).toEqual(resampleBars(hours, '1d'));
  });
});

describe('pickBaseTimeframe in a time zone', () => {
  it('builds days from bars that line up with the zone’s midnight', () => {
    expect(pickBaseTimeframe('1d', ['1h', '4h'], { timeZone: VN })).toBe('1h');
    expect(pickBaseTimeframe('12h', ['1h', '4h'], { timeZone: NY })).toBe('1h');
    expect(pickBaseTimeframe('1d', ['1h', '30m'], { timeZone: 'Asia/Kolkata' })).toBe('30m');
  });

  it('is null when none lines up, and keeps today’s pick without a zone', () => {
    expect(pickBaseTimeframe('1d', ['4h'], { timeZone: VN })).toBeNull();
    expect(pickBaseTimeframe('1d', ['1h', '4h'])).toBe('4h');
    expect(pickBaseTimeframe('1d', ['1h', '4h'], { timeZone: 'UTC' })).toBe('4h');
  });

  it('leaves frames that keep the epoch floor alone', () => {
    expect(pickBaseTimeframe('90m', ['30m'], { timeZone: 'Asia/Kolkata' })).toBe('30m');
    expect(pickBaseTimeframe('1w', ['1h', '1d'], { timeZone: VN })).toBe('1d');
  });
});

describe('barDateParts', () => {
  it('names the UTC date of a bar stamped at 00:00 UTC, in any zone', () => {
    const parts = barDateParts(Date.UTC(2026, 9, 23), NY, VN);
    expect([parts.year, parts.month, parts.day]).toEqual([2026, 10, 23]);
  });

  it('reads any other bar in the exchange’s zone, else in the zone shown', () => {
    const built = Date.UTC(2026, 9, 22, 17); // 23 October, 00:00 in Ho Chi Minh City
    expect(barDateParts(built, 'UTC', VN).day).toBe(23);
    expect(barDateParts(built, NY, VN).day).toBe(23);
    expect(barDateParts(built, 'UTC', null).day).toBe(22);
  });

  it('reads a bar off the exchange’s midnight in the zone shown', () => {
    // Stamped at midnight in Ho Chi Minh City, a browser's zone, for a New York market: 13:00 the day before there.
    const local = Date.UTC(2026, 9, 22, 17);
    expect(barDateParts(local, VN, NY).day).toBe(23);
    // One built at New York's midnight keeps New York's date.
    expect(barDateParts(Date.UTC(2026, 9, 23, 4), VN, NY).day).toBe(23);
  });
});

describe('timeframeSpansDays', () => {
  it('is true for bars a day long or more', () => {
    expect(['1d', '2d', '1w', '1M', '12M'].map((tf) => timeframeSpansDays(tf))).toEqual([true, true, true, true, true]);
  });

  it('is false for hours, minutes and tick bars', () => {
    expect(['4h', '12h', '1h', '7m', '100T'].map((tf) => timeframeSpansDays(tf))).toEqual([false, false, false, false, false]);
  });
});
