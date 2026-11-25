import { describe, it, expect } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { sessionVolumeProfiles } from '../overlay/sessionVolumeProfiles.js';
import { SessionVolumeProfileIndicator } from '../overlay/SessionVolumeProfile.js';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** Midnight UTC of a Monday: times near 0 would be read as seconds. */
const BASE = Date.UTC(2025, 0, 6);

/** Hourly bars from [low, high, volume], starting at midnight UTC of day 0. */
const bars = (rows: [number, number, number][], start = 0): OHLCBar[] =>
  rows.map(([low, high, volume], i) => ({ time: BASE + start + i * HOUR, open: low, high, low, close: high, volume }));

describe('sessionVolumeProfiles', () => {
  it('makes one profile a day, its rows spread over the day’s range, each bar’s volume shared by the rows it covers', () => {
    // Day 0: 100-104 with 40 traded across it, 100-101 with 60 at its foot. Day 1: one bar.
    const data = [...bars([[100, 104, 40], [100, 101, 60]]), ...bars([[200, 202, 10]], DAY)];
    const [first, second] = sessionVolumeProfiles(data, { rows: 4 });
    expect(first).toMatchObject({ start: 0, end: 1, low: 100, high: 104, rowHeight: 1 });
    // 40 over four rows is 10 each; 60 over the first row alone (101 is its top, not in the next).
    expect(first.volumes).toEqual([70, 10, 10, 10]);
    expect(first.poc).toBe(100.5);
    expect(second).toMatchObject({ start: 2, end: 2, low: 200, high: 202 });
    expect(second.volumes.reduce((a, b) => a + b, 0)).toBe(10);
  });

  it('holds 70% of the day’s volume in its value area, grown from the busiest row toward the heavier side', () => {
    // Rows of 10, 20, 50, 15, 5 from the bottom: the POC is the middle one.
    const data = bars([[0, 0.99, 10], [1, 1.99, 20], [2, 2.99, 50], [3, 3.99, 15], [4, 5, 5]]);
    const [p] = sessionVolumeProfiles(data, { rows: 5 });
    expect(p.volumes).toEqual([10, 20, 50, 15, 5]);
    expect(p.poc).toBe(2.5);
    // 50, then 20 below (heavier than 15 above): 70 of 100.
    expect([p.valueAreaLow, p.valueAreaHigh]).toEqual([1, 3]);
    expect(p.valueAreaRows).toEqual([1, 2]);
    const wide = sessionVolumeProfiles(data, { rows: 5, valueArea: 90 })[0];
    expect([wide.valueAreaLow, wide.valueAreaHigh]).toEqual([0, 4]);
  });

  it('starts a day at midnight on the exchange’s clock when given one', () => {
    // 22:00 and 23:00 UTC on day 0, then 00:00 UTC on day 1: in Ho Chi Minh City (UTC+7) all three are day 1.
    const data = bars([[1, 2, 1], [1, 2, 1], [1, 2, 1]], 22 * HOUR);
    expect(sessionVolumeProfiles(data, { rows: 2 }).map((p) => [p.start, p.end])).toEqual([[0, 1], [2, 2]]);
    expect(sessionVolumeProfiles(data, { rows: 2, timeZone: 'Asia/Ho_Chi_Minh' }).map((p) => [p.start, p.end])).toEqual([[0, 2]]);
  });

  it('skips bars with no volume or no range that is a number, and days with none left', () => {
    const data = bars([[1, 2, 0], [1, Number.NaN, 5], [3, 3, 6]]);
    const [p] = sessionVolumeProfiles(data, { rows: 3 });
    // The flat bar at 3 counts, in the row at its price; the day's range is that one price.
    expect(p.volumes.reduce((a, b) => a + b, 0)).toBe(6);
    expect(p.poc).toBe(3);
    expect(sessionVolumeProfiles(bars([[1, 2, 0]]), { rows: 3 })).toEqual([]);
    expect(sessionVolumeProfiles([], {})).toEqual([]);
  });
});

describe('the Session Volume Profile indicator', () => {
  /** Four days of hourly bars from a seeded walk. */
  function walk(days: number): OHLCBar[] {
    let seed = 5;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    let close = 100;
    return Array.from({ length: days * 24 }, (_, i) => {
      const open = close;
      close = open + (rand() - 0.5) * 2;
      return { time: BASE + i * HOUR, open, high: Math.max(open, close) + rand(), low: Math.min(open, close) - rand(), close, volume: 100 + Math.round(rand() * 900) };
    });
  }
  const config = { id: 'svp', params: {} } as never;

  it('gives each bar its day’s POC and value area, breaking the lines at each new day', () => {
    const indicator = new SessionVolumeProfileIndicator();
    expect(indicator.descriptor).toMatchObject({ id: 'svp', placement: 'overlay', readsExchangeTimeZone: true });
    expect(indicator.descriptor.plots!.map((p) => p.key)).toEqual(['poc', 'vah', 'val']);
    const data = walk(4);
    const out = indicator.calculate(data, config);
    const profiles = out.meta!.profiles as { start: number; end: number; poc: number; valueAreaHigh: number; valueAreaLow: number }[];
    expect(profiles).toHaveLength(4);
    for (const p of profiles) {
      for (let i = p.start; i <= p.end; i++) {
        expect(out.series![i]).toMatchObject({ poc: p.poc, vah: p.valueAreaHigh, val: p.valueAreaLow, session: p.start });
      }
    }
  });

  it('goes on from a tick to what a whole reckoning gives, working out again only the day it is in', () => {
    const indicator = new SessionVolumeProfileIndicator();
    const data = walk(4);
    const snapshot = (out: { meta?: Record<string, unknown>; series?: unknown; values: Map<number, unknown> }) =>
      ({ profiles: out.meta!.profiles, series: out.series, values: [...out.values].sort((a, b) => a[0] - b[0]) });
    let out = indicator.calculate(data.slice(0, 50), config);
    const before = (out.meta!.profiles as unknown[])[0];
    for (let n = 51; n <= data.length; n++) {
      const series = data.slice(0, n);
      const next = indicator.update!(series, config, out, n - 1);
      expect(next).not.toBeNull();
      out = next!;
      expect(snapshot(out)).toEqual(snapshot(new SessionVolumeProfileIndicator().calculate(series, config)));
    }
    // The first day, done before the ticks, is the same object: it was not worked out again.
    expect((out.meta!.profiles as unknown[])[0]).toBe(before);
  });
});
