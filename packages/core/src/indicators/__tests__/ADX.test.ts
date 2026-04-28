import { describe, it, expect } from 'vitest';
import { ADXIndicator } from '../panel/ADX.js';
import { ohlcBars, indicatorConfig } from './fixtures.js';

describe('ADXIndicator', () => {
  const adx = new ADXIndicator();

  it('returns empty output when data length < period * 2', () => {
    const data = ohlcBars(
      Array.from({ length: 20 }, () => ({ o: 100, h: 102, l: 98, c: 100 })),
    );
    const { values } = adx.calculate(data, indicatorConfig('adx', { period: 14 }));
    expect(values.size).toBe(0);
  });

  it('reports +DI > -DI on a sustained uptrend', () => {
    const data = ohlcBars(
      Array.from({ length: 60 }, (_, i) => ({
        o: 100 + i,
        h: 102 + i,
        l: 99 + i,
        c: 101 + i,
      })),
    );
    const { series } = adx.calculate(data, indicatorConfig('adx', { period: 14 }));
    const last = series![data.length - 1]!;
    expect(last.plusDI!).toBeGreaterThan(last.minusDI!);
  });

  it('reports -DI > +DI on a sustained downtrend', () => {
    const data = ohlcBars(
      Array.from({ length: 60 }, (_, i) => ({
        o: 200 - i,
        h: 201 - i,
        l: 198 - i,
        c: 199 - i,
      })),
    );
    const { series } = adx.calculate(data, indicatorConfig('adx', { period: 14 }));
    const last = series![data.length - 1]!;
    expect(last.minusDI!).toBeGreaterThan(last.plusDI!);
  });

  it('keeps DX in [0, 100] across the visible series', () => {
    const data = ohlcBars(
      Array.from({ length: 80 }, (_, i) => ({
        o: 100 + Math.sin(i / 5) * 5,
        h: 102 + Math.sin(i / 5) * 5,
        l: 98 + Math.sin(i / 5) * 5,
        c: 100 + Math.cos(i / 5) * 5,
      })),
    );
    const { series } = adx.calculate(data, indicatorConfig('adx', { period: 14 }));
    for (const v of series!) {
      if (v?.dx !== undefined) {
        expect(v.dx).toBeGreaterThanOrEqual(0);
        expect(v.dx).toBeLessThanOrEqual(100);
      }
    }
  });

  it('emits adx field starting at period * 2', () => {
    const data = ohlcBars(
      Array.from({ length: 60 }, (_, i) => ({
        o: 100 + i,
        h: 102 + i,
        l: 99 + i,
        c: 101 + i,
      })),
    );
    const { series } = adx.calculate(data, indicatorConfig('adx', { period: 14 }));
    expect(series![27]?.adx).toBeUndefined();
    expect(series![28]?.adx).toBeDefined();
  });
});
