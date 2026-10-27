import { describe, it, expect } from 'vitest';
import type { DataSeries, IndicatorConfig } from '@tradecanvas/commons';
import { MTFMovingAverageIndicator } from '../overlay/MTFMovingAverage.js';

const HOUR = 3_600_000;
const day1 = Date.UTC(2023, 0, 2, 0, 0, 0);
const day2 = Date.UTC(2023, 0, 3, 0, 0, 0);
const day3 = Date.UTC(2023, 0, 4, 0, 0, 0);

function cfg(params: Record<string, number | string>): IndicatorConfig {
  return { id: 'mtfma', instanceId: 'mtf-1', params, visible: true } as IndicatorConfig;
}

describe('MTFMovingAverageIndicator', () => {
  const ind = new MTFMovingAverageIndicator();

  it('is null until `period` higher-timeframe buckets have completed', () => {
    // period=2, daily TF. Day1 + Day2 bars → only 1 completed bucket by Day2.
    const data: DataSeries = [
      { time: day1, open: 1, high: 1, low: 1, close: 10, volume: 1 },
      { time: day2, open: 1, high: 1, low: 1, close: 20, volume: 1 },
    ];
    const out = ind.calculate(data, cfg({ period: 2, timeframe: '1d' }));
    expect(out.series?.every((v) => v === null)).toBe(true);
  });

  it('steps to the average of completed daily closes, non-repainting', () => {
    const data: DataSeries = [
      { time: day1, open: 1, high: 1, low: 1, close: 10, volume: 1 },
      { time: day1 + HOUR, open: 1, high: 1, low: 1, close: 12, volume: 1 }, // day1 close = 12
      { time: day2, open: 1, high: 1, low: 1, close: 20, volume: 1 },
      { time: day2 + HOUR, open: 1, high: 1, low: 1, close: 22, volume: 1 }, // day2 close = 22
      { time: day3, open: 1, high: 1, low: 1, close: 30, volume: 1 },        // day3 (current)
    ];
    const out = ind.calculate(data, cfg({ period: 2, timeframe: '1d' }));
    const s = out.series!;
    // Day1 + Day2 bars: < 2 completed buckets → null.
    expect(s[0]).toBeNull();
    expect(s[1]).toBeNull();
    expect(s[2]).toBeNull();
    expect(s[3]).toBeNull();
    // Day3 bar: two completed buckets (12, 22) → avg 17.
    expect(s[4]?.value).toBe(17);
  });

  it('returns empty for empty data', () => {
    const out = ind.calculate([], cfg({ period: 5, timeframe: '1d' }));
    expect(out.series).toEqual([]);
  });

  it('counts its days from midnight in config.exchangeTimeZone, as the session VWAP does', () => {
    // ASX sessions, 10:00–15:00 in Sydney: 23:00 UTC the day before to 04:00 UTC.
    const session = (d: number, close: number): DataSeries =>
      Array.from({ length: 6 }, (_, h) => ({ time: Date.UTC(2026, 9, 25 + d, 23) + h * HOUR, open: 1, high: 1, low: 1, close, volume: 1 }));
    const data = [...session(0, 10), ...session(1, 20), ...session(2, 30)];
    const zoned = { ...cfg({ period: 1, timeframe: '1d' }), exchangeTimeZone: 'Australia/Sydney' };
    const s = ind.calculate(data, zoned).series!;
    // A day is one session: the third session's bars all read the second's close.
    expect(s.slice(12).map((v) => v?.value)).toEqual([20, 20, 20, 20, 20, 20]);
  });

  it('reads bar times given in seconds', () => {
    const data: DataSeries = [day1, day1 + HOUR, day2, day2 + HOUR, day3].map((t, i) => ({ time: t / 1000, open: 1, high: 1, low: 1, close: [10, 12, 20, 22, 30][i], volume: 1 }));
    expect(ind.calculate(data, cfg({ period: 2, timeframe: '1d' })).series![4]?.value).toBe(17);
  });
});
