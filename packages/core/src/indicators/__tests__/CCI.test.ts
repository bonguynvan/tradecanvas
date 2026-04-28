import { describe, it, expect } from 'vitest';
import { CCIIndicator } from '../panel/CCI.js';
import { ohlcBars, indicatorConfig } from './fixtures.js';

describe('CCIIndicator', () => {
  const cci = new CCIIndicator();

  it('returns no values when data length < period', () => {
    const data = ohlcBars(
      Array.from({ length: 5 }, () => ({ o: 100, h: 102, l: 98, c: 100 })),
    );
    const { values } = cci.calculate(data, indicatorConfig('cci', { period: 20 }));
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
    const { series } = cci.calculate(data, indicatorConfig('cci', { period: 20 }));
    expect(series!.findIndex((v) => v !== null)).toBe(19);
  });

  it('returns 0 when typical price has zero deviation (flat input)', () => {
    const data = ohlcBars(
      Array.from({ length: 30 }, () => ({ o: 100, h: 100, l: 100, c: 100 })),
    );
    const { series } = cci.calculate(data, indicatorConfig('cci', { period: 20 }));
    const last = series![data.length - 1]!;
    expect(last.value).toBe(0);
  });

  it('produces large positive values when price spikes far above the mean', () => {
    const data = ohlcBars(
      Array.from({ length: 25 }, (_, i) => ({
        o: 100,
        h: 100,
        l: 100,
        c: i === 24 ? 200 : 100, // spike on the last bar
      })),
    );
    const { series } = cci.calculate(data, indicatorConfig('cci', { period: 20 }));
    const last = series![data.length - 1]!;
    expect(last.value!).toBeGreaterThan(100);
  });

  it('produces large negative values when price drops far below the mean', () => {
    const data = ohlcBars(
      Array.from({ length: 25 }, (_, i) => ({
        o: 100,
        h: 100,
        l: 100,
        c: i === 24 ? 50 : 100,
      })),
    );
    const { series } = cci.calculate(data, indicatorConfig('cci', { period: 20 }));
    const last = series![data.length - 1]!;
    expect(last.value!).toBeLessThan(-100);
  });
});
