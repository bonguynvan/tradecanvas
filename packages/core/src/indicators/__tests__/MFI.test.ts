import { describe, it, expect } from 'vitest';
import { MFIIndicator } from '../panel/MFI.js';
import { ohlcBars, indicatorConfig } from './fixtures.js';

describe('MFIIndicator', () => {
  const mfi = new MFIIndicator();

  it('returns empty output when data length <= period', () => {
    const data = ohlcBars(
      Array.from({ length: 14 }, () => ({ o: 100, h: 102, l: 98, c: 100, v: 1000 })),
    );
    const { values } = mfi.calculate(data, indicatorConfig('mfi', { period: 14 }));
    expect(values.size).toBe(0);
  });

  it('saturates at 100 on a strict uptrend (only positive money flow)', () => {
    const data = ohlcBars(
      Array.from({ length: 30 }, (_, i) => ({
        o: 100 + i,
        h: 101 + i,
        l: 99 + i,
        c: 100 + i,
        v: 1000,
      })),
    );
    const { series } = mfi.calculate(data, indicatorConfig('mfi', { period: 14 }));
    const last = series![data.length - 1]!;
    expect(last.value!).toBeCloseTo(100, 6);
  });

  it('saturates at 0 on a strict downtrend (only negative money flow)', () => {
    const data = ohlcBars(
      Array.from({ length: 30 }, (_, i) => ({
        o: 200 - i,
        h: 201 - i,
        l: 199 - i,
        c: 200 - i,
        v: 1000,
      })),
    );
    const { series } = mfi.calculate(data, indicatorConfig('mfi', { period: 14 }));
    const last = series![data.length - 1]!;
    expect(last.value!).toBeCloseTo(0, 6);
  });

  it('keeps the value within [0, 100] on noisy data', () => {
    const data = ohlcBars(
      Array.from({ length: 50 }, (_, i) => ({
        o: 100 + Math.sin(i) * 5,
        h: 102 + Math.sin(i) * 5,
        l: 98 + Math.sin(i) * 5,
        c: 100 + Math.cos(i) * 5,
        v: 1000 + (i % 5) * 100,
      })),
    );
    const { series } = mfi.calculate(data, indicatorConfig('mfi', { period: 14 }));
    for (const v of series!) {
      if (v?.value !== undefined) {
        expect(v.value).toBeGreaterThanOrEqual(0);
        expect(v.value).toBeLessThanOrEqual(100);
      }
    }
  });

  it('first non-null index is at period', () => {
    const data = ohlcBars(
      Array.from({ length: 30 }, (_, i) => ({
        o: 100 + i,
        h: 101 + i,
        l: 99 + i,
        c: 100 + i,
        v: 100,
      })),
    );
    const { series } = mfi.calculate(data, indicatorConfig('mfi', { period: 14 }));
    expect(series!.findIndex((v) => v !== null)).toBe(14);
  });
});
