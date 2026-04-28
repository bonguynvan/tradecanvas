import { describe, it, expect } from 'vitest';
import { DonchianChannelIndicator } from '../overlay/DonchianChannel.js';
import { ohlcBars, indicatorConfig } from './fixtures.js';

describe('DonchianChannelIndicator', () => {
  const donchian = new DonchianChannelIndicator();

  it('returns empty output when data length < period', () => {
    const data = ohlcBars(
      Array.from({ length: 5 }, () => ({ o: 100, h: 102, l: 98, c: 100 })),
    );
    const { values } = donchian.calculate(data, indicatorConfig('donchian', { period: 20 }));
    expect(values.size).toBe(0);
  });

  it('upper / lower equal the rolling high / low and middle is their midpoint', () => {
    const data = ohlcBars([
      { o: 100, h: 105, l: 95, c: 100 },
      { o: 100, h: 110, l: 90, c: 100 },
      { o: 100, h: 108, l: 92, c: 100 },
      { o: 100, h: 107, l: 93, c: 100 },
    ]);
    const { series } = donchian.calculate(data, indicatorConfig('donchian', { period: 4 }));
    const v = series![3]!;
    expect(v.upper).toBe(110);
    expect(v.lower).toBe(90);
    expect(v.middle).toBe(100);
  });

  it('first non-null index equals period - 1', () => {
    const data = ohlcBars(
      Array.from({ length: 30 }, (_, i) => ({
        o: 100 + i,
        h: 102 + i,
        l: 99 + i,
        c: 101 + i,
      })),
    );
    const { series } = donchian.calculate(data, indicatorConfig('donchian', { period: 10 }));
    expect(series!.findIndex((v) => v !== null)).toBe(9);
  });

  it('upper >= middle >= lower invariant on noisy data', () => {
    const data = ohlcBars(
      Array.from({ length: 60 }, (_, i) => ({
        o: 100 + i,
        h: 102 + i + (i % 4),
        l: 98 + i - (i % 5),
        c: 100 + i,
      })),
    );
    const { series } = donchian.calculate(data, indicatorConfig('donchian', { period: 20 }));
    for (const v of series!) {
      if (!v) continue;
      expect(v.upper!).toBeGreaterThanOrEqual(v.middle!);
      expect(v.middle!).toBeGreaterThanOrEqual(v.lower!);
    }
  });

  it('upper trends up and lower stays low on a rising series', () => {
    const data = ohlcBars(
      Array.from({ length: 40 }, (_, i) => ({
        o: 100 + i,
        h: 100 + i + 1,
        l: 100 + i - 1,
        c: 100 + i,
      })),
    );
    const { series } = donchian.calculate(data, indicatorConfig('donchian', { period: 20 }));
    const last = series![data.length - 1]!;
    // Last 20 bars span indices 20..39: highs from 121..140, lows from 119..138.
    expect(last.upper).toBe(140);
    expect(last.lower).toBe(119);
  });
});
