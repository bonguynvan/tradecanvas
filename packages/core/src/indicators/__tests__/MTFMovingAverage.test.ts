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
});
