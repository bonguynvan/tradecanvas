import { describe, it, expect } from 'vitest';
import { StochasticIndicator } from '../panel/Stochastic.js';
import { ohlcBars, indicatorConfig } from './fixtures.js';

describe('StochasticIndicator', () => {
  const stoch = new StochasticIndicator();
  const params = { kPeriod: 14, dPeriod: 3, smooth: 3 };

  it('returns empty output when data length < kPeriod', () => {
    const data = ohlcBars(
      Array.from({ length: 5 }, () => ({ o: 100, h: 102, l: 98, c: 100 })),
    );
    const { values } = stoch.calculate(data, indicatorConfig('stoch', params));
    expect(values.size).toBe(0);
  });

  it('saturates %K at 100 when close equals the period high', () => {
    const data = ohlcBars(
      Array.from({ length: 30 }, (_, i) => ({
        o: 100 + i,
        h: 100 + i,
        l: 100 - i, // long-run low; close == high
        c: 100 + i,
      })),
    );
    const { series } = stoch.calculate(data, indicatorConfig('stoch', params));
    const last = series![data.length - 1]!;
    expect(last.k!).toBeCloseTo(100, 4);
  });

  it('saturates %K near 0 when close equals the period low', () => {
    const data = ohlcBars(
      Array.from({ length: 30 }, (_, i) => ({
        o: 200 - i,
        h: 200 + i,
        l: 200 - i,
        c: 200 - i,
      })),
    );
    const { series } = stoch.calculate(data, indicatorConfig('stoch', params));
    const last = series![data.length - 1]!;
    expect(last.k!).toBeLessThan(20);
  });

  it('returns 50 when high equals low (no range to normalize against)', () => {
    const data = ohlcBars(
      Array.from({ length: 20 }, () => ({ o: 100, h: 100, l: 100, c: 100 })),
    );
    const { series } = stoch.calculate(
      data,
      indicatorConfig('stoch', { kPeriod: 5, dPeriod: 3, smooth: 1 }),
    );
    const last = series![data.length - 1]!;
    expect(last.k!).toBeCloseTo(50);
  });

  it('emits %D after one extra dPeriod warmup beyond %K', () => {
    const data = ohlcBars(
      Array.from({ length: 50 }, (_, i) => ({
        o: 100 + i,
        h: 102 + i,
        l: 98 + i,
        c: 101 + i,
      })),
    );
    const { series } = stoch.calculate(data, indicatorConfig('stoch', params));
    // %K starts at kPeriod-1 + smooth-1 = 15; %D needs another dPeriod-1, so 17.
    const firstWithD = series!.findIndex((v) => v !== null && v.d !== undefined);
    expect(firstWithD).toBe(17);
  });

  it('keeps %K within [0, 100] on noisy data', () => {
    const data = ohlcBars(
      Array.from({ length: 60 }, (_, i) => ({
        o: 100 + Math.sin(i) * 5,
        h: 105 + Math.sin(i) * 5,
        l: 95 + Math.sin(i) * 5,
        c: 100 + Math.cos(i) * 5,
      })),
    );
    const { series } = stoch.calculate(data, indicatorConfig('stoch', params));
    for (const v of series!) {
      if (v?.k !== undefined) {
        expect(v.k).toBeGreaterThanOrEqual(0);
        expect(v.k).toBeLessThanOrEqual(100);
      }
    }
  });
});
