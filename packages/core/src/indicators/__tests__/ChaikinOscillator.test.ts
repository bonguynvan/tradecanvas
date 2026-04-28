import { describe, it, expect } from 'vitest';
import { ChaikinOscillatorIndicator } from '../panel/ChaikinOscillator.js';
import { ohlcBars, indicatorConfig } from './fixtures.js';

describe('ChaikinOscillatorIndicator', () => {
  const chaikin = new ChaikinOscillatorIndicator();
  const params = { fast: 3, slow: 10 };

  it('returns empty output when data length < slow', () => {
    const data = ohlcBars(
      Array.from({ length: 5 }, () => ({ o: 10, h: 11, l: 9, c: 10, v: 100 })),
    );
    const { values } = chaikin.calculate(data, indicatorConfig('chaikin', params));
    expect(values.size).toBe(0);
  });

  it('first non-null index equals slow - 1', () => {
    const data = ohlcBars(
      Array.from({ length: 30 }, (_, i) => ({
        o: 100 + i,
        h: 102 + i,
        l: 99 + i,
        c: 101 + i,
        v: 1000,
      })),
    );
    const { series } = chaikin.calculate(data, indicatorConfig('chaikin', params));
    expect(series!.findIndex((v) => v !== null)).toBe(params.slow - 1);
  });

  it('handles zero-range bars without producing NaN', () => {
    const data = ohlcBars(
      Array.from({ length: 30 }, () => ({ o: 100, h: 100, l: 100, c: 100, v: 1000 })),
    );
    const { series } = chaikin.calculate(data, indicatorConfig('chaikin', params));
    const last = series![series!.length - 1]!;
    expect(Number.isFinite(last.value!)).toBe(true);
    expect(last.value!).toBeCloseTo(0, 6);
  });

  it('is positive when buying pressure dominates (close near high)', () => {
    const data = ohlcBars(
      Array.from({ length: 40 }, () => ({ o: 100, h: 105, l: 100, c: 105, v: 1000 })),
    );
    const { series } = chaikin.calculate(data, indicatorConfig('chaikin', params));
    const last = series![series!.length - 1]!;
    expect(last.value!).toBeGreaterThanOrEqual(0);
  });

  it('exposes cumulative ADL alongside the oscillator value', () => {
    const data = ohlcBars(
      Array.from({ length: 40 }, () => ({ o: 100, h: 105, l: 100, c: 105, v: 1000 })),
    );
    const { series } = chaikin.calculate(data, indicatorConfig('chaikin', params));
    const last = series![series!.length - 1]!;
    expect(last.adl).toBeDefined();
    expect(last.adl!).toBeGreaterThan(0);
  });
});
