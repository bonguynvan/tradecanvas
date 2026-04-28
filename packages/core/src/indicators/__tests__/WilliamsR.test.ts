import { describe, it, expect } from 'vitest';
import { WilliamsRIndicator } from '../panel/WilliamsR.js';
import { ohlcBars, indicatorConfig } from './fixtures.js';

describe('WilliamsRIndicator', () => {
  const wr = new WilliamsRIndicator();

  it('returns empty output when data length < period', () => {
    const data = ohlcBars(
      Array.from({ length: 5 }, () => ({ o: 100, h: 102, l: 98, c: 100 })),
    );
    const { values } = wr.calculate(data, indicatorConfig('wr', { period: 14 }));
    expect(values.size).toBe(0);
  });

  it('first non-null index equals period - 1', () => {
    const data = ohlcBars(
      Array.from({ length: 30 }, (_, i) => ({
        o: 100 + i,
        h: 101 + i,
        l: 99 + i,
        c: 100 + i,
      })),
    );
    const { series } = wr.calculate(data, indicatorConfig('wr', { period: 14 }));
    expect(series!.findIndex((v) => v !== null)).toBe(13);
  });

  it('returns 0 when close equals the period high', () => {
    const data = ohlcBars(
      Array.from({ length: 20 }, (_, i) => ({
        o: 100 - i,
        h: 100, // constant high
        l: 100 - i - 5,
        c: 100, // close at the high
      })),
    );
    const { series } = wr.calculate(data, indicatorConfig('wr', { period: 14 }));
    const last = series![data.length - 1]!;
    expect(last.value!).toBeCloseTo(0, 6);
  });

  it('returns -100 when close equals the period low', () => {
    const data = ohlcBars(
      Array.from({ length: 20 }, (_, i) => ({
        o: 100 + i,
        h: 100 + i + 5,
        l: 50, // constant low
        c: 50, // close at the low
      })),
    );
    const { series } = wr.calculate(data, indicatorConfig('wr', { period: 14 }));
    const last = series![data.length - 1]!;
    expect(last.value!).toBeCloseTo(-100, 6);
  });

  it('returns -50 when high equals low (range collapses)', () => {
    const data = ohlcBars(
      Array.from({ length: 20 }, () => ({ o: 100, h: 100, l: 100, c: 100 })),
    );
    const { series } = wr.calculate(data, indicatorConfig('wr', { period: 14 }));
    const last = series![data.length - 1]!;
    expect(last.value).toBe(-50);
  });

  it('keeps values within [-100, 0]', () => {
    const data = ohlcBars(
      Array.from({ length: 50 }, (_, i) => ({
        o: 100 + Math.sin(i) * 5,
        h: 102 + Math.sin(i) * 5,
        l: 98 + Math.sin(i) * 5,
        c: 100 + Math.cos(i) * 5,
      })),
    );
    const { series } = wr.calculate(data, indicatorConfig('wr', { period: 14 }));
    for (const v of series!) {
      if (v?.value !== undefined) {
        expect(v.value).toBeGreaterThanOrEqual(-100);
        expect(v.value).toBeLessThanOrEqual(0);
      }
    }
  });
});
