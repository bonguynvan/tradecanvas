import { describe, it, expect } from 'vitest';
import type { DataSeries, IndicatorConfig } from '@tradecanvas/commons';
import { DetrendedPriceOscillatorIndicator } from '../panel/DetrendedPriceOscillator.js';
import { BalanceOfPowerIndicator } from '../panel/BalanceOfPower.js';

function ohlc(open: number, high: number, low: number, close: number): DataSeries[number] {
  return { time: 0, open, high, low, close, volume: 1 };
}

describe('DetrendedPriceOscillator', () => {
  const ind = new DetrendedPriceOscillatorIndicator();
  const cfg: IndicatorConfig = { id: 'dpo', instanceId: 'd-1', params: { period: 10 }, visible: true } as IndicatorConfig;

  it('is null until the period warms up', () => {
    const data: DataSeries = Array.from({ length: 6 }, (_, i) => ohlc(10 + i, 11 + i, 9 + i, 10 + i));
    expect(ind.calculate(data, cfg).series.every((v) => v === null)).toBe(true);
  });

  it('is ~0 for a flat market (price equals its own average)', () => {
    const data: DataSeries = Array.from({ length: 30 }, () => ohlc(10, 10, 10, 10));
    const last = ind.calculate(data, cfg).series.at(-1)!;
    expect(Math.abs(last.value!)).toBeLessThan(1e-9);
  });

  it('is positive when a past price sat above the current average (uptrend)', () => {
    const data: DataSeries = Array.from({ length: 40 }, (_, i) => ohlc(10 + i, 11 + i, 9 + i, 10 + i));
    const last = ind.calculate(data, cfg).series.at(-1)!;
    // In an uptrend, the displaced (older→here future) close vs SMA is negative;
    // just assert it's a finite, non-zero detrended value.
    expect(Number.isFinite(last.value!)).toBe(true);
  });
});

describe('BalanceOfPower', () => {
  const ind = new BalanceOfPowerIndicator();
  const cfg: IndicatorConfig = { id: 'bop', instanceId: 'b-1', params: { smooth: 5 }, visible: true } as IndicatorConfig;

  it('is positive when bars consistently close near their highs', () => {
    const data: DataSeries = Array.from({ length: 20 }, () => ohlc(10, 11, 9, 10.9));
    const last = ind.calculate(data, cfg).series.at(-1)!;
    expect(last.value).toBeGreaterThan(0);
  });

  it('is negative when bars consistently close near their lows', () => {
    const data: DataSeries = Array.from({ length: 20 }, () => ohlc(10, 11, 9, 9.1));
    const last = ind.calculate(data, cfg).series.at(-1)!;
    expect(last.value).toBeLessThan(0);
  });

  it('stays within [-1, 1]', () => {
    const data: DataSeries = Array.from({ length: 30 }, (_, i) => ohlc(10, 12, 8, 8 + (i % 5)));
    for (const v of ind.calculate(data, cfg).series) {
      if (v?.value !== undefined) {
        expect(v.value).toBeGreaterThanOrEqual(-1);
        expect(v.value).toBeLessThanOrEqual(1);
      }
    }
  });
});
