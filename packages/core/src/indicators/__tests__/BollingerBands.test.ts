import { describe, it, expect } from 'vitest';
import { BollingerBandsIndicator } from '../overlay/BollingerBands.js';
import { bars, indicatorConfig } from './fixtures.js';

describe('BollingerBandsIndicator', () => {
  const bb = new BollingerBandsIndicator();

  it('returns empty output when data length < period', () => {
    const data = bars([1, 2, 3]);
    const { values } = bb.calculate(
      data,
      indicatorConfig('bb', { period: 20, stdDev: 2 }),
    );
    expect(values.size).toBe(0);
  });

  it('first non-null index equals period - 1', () => {
    const data = bars(Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i / 3)));
    const { series } = bb.calculate(data, indicatorConfig('bb', { period: 10, stdDev: 2 }));
    expect(series!.findIndex((v) => v !== null)).toBe(9);
  });

  it('on a flat series the bands collapse onto the middle band', () => {
    const data = bars(Array(40).fill(100));
    const { series } = bb.calculate(data, indicatorConfig('bb', { period: 20, stdDev: 2 }));
    const last = series![data.length - 1]!;
    expect(last.middle!).toBeCloseTo(100);
    expect(last.upper!).toBeCloseTo(100, 6);
    expect(last.lower!).toBeCloseTo(100, 6);
  });

  it('matches the closed-form result on a known sample', () => {
    // closes [2, 4, 4, 4, 5, 5, 7, 9] with period 8: mean = 5, popStdDev = 2.
    const data = bars([2, 4, 4, 4, 5, 5, 7, 9]);
    const { series } = bb.calculate(data, indicatorConfig('bb', { period: 8, stdDev: 2 }));
    const v = series![7]!;
    expect(v.middle!).toBeCloseTo(5);
    expect(v.upper!).toBeCloseTo(9);
    expect(v.lower!).toBeCloseTo(1);
  });

  it('preserves upper > middle > lower on noisy data', () => {
    const data = bars(Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i) * 4));
    const { series } = bb.calculate(data, indicatorConfig('bb', { period: 20, stdDev: 2 }));
    const last = series![data.length - 1]!;
    expect(last.upper!).toBeGreaterThan(last.middle!);
    expect(last.middle!).toBeGreaterThan(last.lower!);
  });
});
