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

  it('emits ±σ bands that widen as intra-session dispersion grows', () => {
    const data: DataSeries = [
      bar(day1, 10, 100),        // single bar → variance 0 → bands collapse to vwap
      bar(day1 + HOUR, 20, 100), // now two prices 10 & 20 → σ > 0
    ];
    const cfg2 = { id: 'svwap', instanceId: 's-2', params: { bands: 2 }, visible: true } as IndicatorConfig;
    const s = ind.calculate(data, cfg2).series!;
    // First bar: no dispersion → u1 == l1 == value.
    expect(s[0]?.u1).toBeCloseTo(s[0]!.value!, 6);
    // Second bar: vwap 15, σ = 5 → u1 20, l1 10, u2 25, l2 5.
    expect(s[1]?.value).toBeCloseTo(15, 6);
    expect(s[1]?.u1).toBeCloseTo(20, 6);
    expect(s[1]?.l1).toBeCloseTo(10, 6);
    expect(s[1]?.u2).toBeCloseTo(25, 6);
    expect(s[1]?.l2).toBeCloseTo(5, 6);
  });

  it('omits bands when bands = 0', () => {
    const cfg0 = { id: 'svwap', instanceId: 's-0', params: { bands: 0 }, visible: true } as IndicatorConfig;
    const s = ind.calculate([bar(day1, 10, 100), bar(day1 + HOUR, 20, 100)], cfg0).series!;
    expect(s[1]?.u1).toBeUndefined();
  });
});
