import { describe, it, expect } from 'vitest';
import type { DataSeries, IndicatorConfig } from '@tradecanvas/commons';
import { ChaikinVolatilityIndicator } from '../panel/ChaikinVolatility.js';
import { RelativeVigorIndicator } from '../panel/RelativeVigor.js';
import { StochasticRSIIndicator } from '../panel/StochasticRSI.js';

function bar(open: number, high: number, low: number, close: number, volume = 100): DataSeries[number] {
  return { time: 0, open, high, low, close, volume };
}

describe('ChaikinVolatility', () => {
  const ind = new ChaikinVolatilityIndicator();
  const cfg = { id: 'chaikinvol', instanceId: 'c-1', params: { ema: 5, roc: 5 }, visible: true } as IndicatorConfig;

  it('is null until ema + roc warms up', () => {
    const data: DataSeries = Array.from({ length: 6 }, (_, i) => bar(10 + i, 11 + i, 9 + i, 10 + i));
    expect(ind.calculate(data, cfg).series.every((v) => v === null)).toBe(true);
  });

  it('is positive when the high-low range expands', () => {
    // Range grows from ~2 to ~20 over the series → EMA of range rising → CV > 0.
    const data: DataSeries = Array.from({ length: 30 }, (_, i) => {
      const half = 1 + i * 0.6;
      return bar(50, 50 + half, 50 - half, 50);
    });
    const last = ind.calculate(data, cfg).series.at(-1)!;
    expect(last.value).toBeGreaterThan(0);
  });

  it('is negative when the range contracts', () => {
    const data: DataSeries = Array.from({ length: 30 }, (_, i) => {
      const half = Math.max(0.5, 20 - i * 0.6);
      return bar(50, 50 + half, 50 - half, 50);
    });
    const last = ind.calculate(data, cfg).series.at(-1)!;
    expect(last.value).toBeLessThan(0);
  });
});

describe('RelativeVigorIndicator', () => {
  const ind = new RelativeVigorIndicator();
  const cfg = { id: 'rvi', instanceId: 'r-1', params: { period: 10 }, visible: true } as IndicatorConfig;

  it('is null until the period warms up', () => {
    const data: DataSeries = Array.from({ length: 8 }, (_, i) => bar(10 + i, 11 + i, 9 + i, 10.5 + i));
    expect(ind.calculate(data, cfg).series.every((v) => v === null)).toBe(true);
  });

  it('is positive in a steady uptrend (close above open)', () => {
    // Each bar closes near its high, well above the open → positive vigor.
    const data: DataSeries = Array.from({ length: 30 }, (_, i) => bar(10 + i, 11.2 + i, 9.8 + i, 11 + i));
    const last = ind.calculate(data, cfg).series.at(-1)!;
    expect(last.value).toBeGreaterThan(0);
  });

  it('is negative in a steady downtrend (close below open)', () => {
    const data: DataSeries = Array.from({ length: 30 }, (_, i) => bar(50 - i, 51.2 - i, 49.8 - i, 49 - i));
    const last = ind.calculate(data, cfg).series.at(-1)!;
    expect(last.value).toBeLessThan(0);
  });

  it('emits a signal line once enough RVI points exist', () => {
    const data: DataSeries = Array.from({ length: 30 }, (_, i) => bar(10 + i, 11.2 + i, 9.8 + i, 11 + i));
    const last = ind.calculate(data, cfg).series.at(-1)!;
    expect(last.signal).toBeTypeOf('number');
  });
});

describe('StochasticRSIIndicator', () => {
  const ind = new StochasticRSIIndicator();
  const cfg = { id: 'stochrsi', instanceId: 's-1', params: { rsiPeriod: 14, stochPeriod: 14, k: 3, d: 3 }, visible: true } as IndicatorConfig;

  it('is null until rsi + stoch warms up', () => {
    const data: DataSeries = Array.from({ length: 20 }, (_, i) => bar(10 + i, 11 + i, 9 + i, 10 + i));
    expect(ind.calculate(data, cfg).series.every((v) => v === null)).toBe(true);
  });

  it('keeps %K and %D within 0–100', () => {
    const data: DataSeries = Array.from({ length: 120 }, (_, i) => {
      const p = 50 + Math.sin(i / 6) * 10;
      return bar(p, p + 1, p - 1, p);
    });
    const s = ind.calculate(data, cfg).series.filter((v) => v && v.k !== undefined);
    expect(s.length).toBeGreaterThan(0);
    for (const v of s) {
      expect(v!.k!).toBeGreaterThanOrEqual(0);
      expect(v!.k!).toBeLessThanOrEqual(100);
      if (v!.d !== undefined) {
        expect(v!.d!).toBeGreaterThanOrEqual(0);
        expect(v!.d!).toBeLessThanOrEqual(100);
      }
    }
  });

  it('reaches both extremes over oscillating data', () => {
    const data: DataSeries = Array.from({ length: 200 }, (_, i) => {
      const p = 50 + Math.sin(i / 8) * 12;
      return bar(p, p + 1, p - 1, p);
    });
    const ks = ind.calculate(data, cfg).series.filter((v) => v && v.k !== undefined).map((v) => v!.k!);
    expect(Math.max(...ks)).toBeGreaterThan(75);
    expect(Math.min(...ks)).toBeLessThan(25);
  });
});
