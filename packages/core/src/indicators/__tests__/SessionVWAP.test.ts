import { describe, it, expect } from 'vitest';
import type { DataSeries, IndicatorConfig, ViewportState } from '@tradecanvas/commons';
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

  it('resets each day when bar times are in seconds', () => {
    const data: DataSeries = Array.from({ length: 48 }, (_, h) => bar((day1 + h * HOUR) / 1000, h < 24 ? 100 : 200, 100));
    const s = ind.calculate(data, cfg).series!;
    expect(s[23]?.value).toBe(100);
    expect(s[24]?.value).toBe(200);
  });

  it('starts its day at midnight in config.exchangeTimeZone', () => {
    // An ASX session, 10:00–15:00 in Sydney (UTC+11 on 2026-10-26): 23:00–04:00 UTC.
    const open = Date.UTC(2026, 9, 25, 23);
    const session: DataSeries = Array.from({ length: 6 }, (_, h) => bar(open + h * HOUR, h === 0 ? 10 : 20, 100));
    const zoned = ind.calculate(session, { ...cfg, exchangeTimeZone: 'Australia/Sydney' }).series!;
    expect(zoned[1]?.value).toBe(15);
    expect(ind.calculate(session, cfg).series![1]?.value).toBe(20);
  });

  /** The segments `render` strokes over all of `data`. */
  function segments(data: DataSeries): number {
    let lines = 0;
    const ctx = new Proxy({}, {
      get: (_t, k) => (k === 'lineTo' ? () => { lines++; } : () => undefined),
      set: () => true,
    }) as unknown as CanvasRenderingContext2D;
    const viewport = {
      visibleRange: { from: 0, to: data.length - 1 }, priceRange: { min: 0, max: 200 }, barWidth: 6, barSpacing: 2, offset: 0,
      chartRect: { x: 0, y: 0, width: 1200, height: 300 },
    } as unknown as ViewportState;
    ind.render(ctx, ind.calculate(data, cfg), viewport, { colors: ['#000', '#111'], lineWidths: [1], opacity: 1 });
    return lines;
  }

  it('on daily bars, joins each day’s typical price into one line, and leaves out the bands a one-bar session holds on it', () => {
    const daily: DataSeries = Array.from({ length: 30 }, (_, i) => ({ time: Date.UTC(2026, 8, 1) + i * 24 * HOUR, open: 100 + i, high: 102 + i, low: 98 + i, close: 101 + i, volume: 1000 }));
    // The VWAP line alone: the ±1σ bands (σ 0) would be two more lines on it.
    expect(segments(daily)).toBe(daily.length - 1);
  });

  it('on daily bars, gives no band values, so its legend shows the line it draws alone', () => {
    const daily: DataSeries = Array.from({ length: 5 }, (_, i) => bar((Date.UTC(2026, 8, 1) + i * 24 * HOUR) / 1000, 100 + i, 1000));
    const s = ind.calculate(daily, { ...cfg, params: { bands: 3 } }).series!;
    expect(s.map((v) => Object.keys(v ?? {}).sort())).toEqual(daily.map(() => ['session', 'value']));
    expect(s[4]?.value).toBe(104);
  });

  it('draws its bands through each session of more than one bar', () => {
    const data: DataSeries = [day1, day2].flatMap((day) => [0, 1, 2].map((h) => bar(day + h * HOUR, 10 + h, 100)));
    // Two segments a session each for the line, +1σ and −1σ.
    expect(segments(data)).toBe(3 * 2 * 2);
  });
});
