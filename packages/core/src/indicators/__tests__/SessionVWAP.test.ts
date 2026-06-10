import { describe, it, expect } from 'vitest';
import type { DataSeries, IndicatorConfig } from '@tradecanvas/commons';
import { SessionVWAPIndicator } from '../overlay/SessionVWAP.js';

const HOUR = 3_600_000;
const day1 = Date.UTC(2023, 0, 2, 0, 0, 0);
const day2 = Date.UTC(2023, 0, 3, 0, 0, 0);

// Flat bars so typical price == the given price.
function bar(time: number, price: number, volume: number): DataSeries[number] {
  return { time, open: price, high: price, low: price, close: price, volume };
}

const cfg = { id: 'svwap', instanceId: 's-1', params: {}, visible: true } as IndicatorConfig;

describe('SessionVWAPIndicator', () => {
  const ind = new SessionVWAPIndicator();

  it('volume-weights within a session', () => {
    const data: DataSeries = [
      bar(day1, 10, 100),          // vwap = 10
      bar(day1 + HOUR, 20, 300),   // (10*100 + 20*300)/400 = 17.5
    ];
    const s = ind.calculate(data, cfg).series!;
    expect(s[0]?.value).toBe(10);
    expect(s[1]?.value).toBeCloseTo(17.5, 6);
  });

  it('resets at the day boundary', () => {
    const data: DataSeries = [
      bar(day1, 10, 100),
      bar(day1 + HOUR, 20, 300),   // day1 vwap 17.5
      bar(day2, 50, 100),          // new session → vwap = 50, not blended with day1
      bar(day2 + HOUR, 60, 100),   // (50+60)/2 = 55
    ];
    const s = ind.calculate(data, cfg).series!;
    expect(s[2]?.value).toBe(50);
    expect(s[3]?.value).toBeCloseTo(55, 6);
    // Session tag changes at the boundary (drives the render line break).
    expect(s[1]?.session).not.toBe(s[2]?.session);
  });

  it('handles empty data', () => {
    expect(ind.calculate([], cfg).series).toEqual([]);
  });
});
