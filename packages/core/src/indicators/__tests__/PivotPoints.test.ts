import { describe, it, expect } from 'vitest';
import { PivotPointsIndicator } from '../overlay/PivotPoints.js';
import { ohlcBars, indicatorConfig } from './fixtures.js';

describe('PivotPointsIndicator', () => {
  const pivots = new PivotPointsIndicator();

  it('returns empty output when data length <= lookback', () => {
    const data = ohlcBars(
      Array.from({ length: 5 }, () => ({ o: 10, h: 12, l: 8, c: 11 })),
    );
    const { values, series } = pivots.calculate(
      data,
      indicatorConfig('pivots', { lookback: 5 }),
    );
    expect(values.size).toBe(0);
    expect(series!.every((v) => v === null)).toBe(true);
  });

  it('computes classic pivot levels from the prior lookback window', () => {
    // Lookback window = 3 bars with H=12, L=8, then close of bar before pivot bar = 11.
    const data = ohlcBars([
      { o: 10, h: 12, l: 8, c: 9 },
      { o: 9, h: 11, l: 8.5, c: 10 },
      { o: 10, h: 11, l: 9, c: 11 },
      { o: 11, h: 11, l: 10, c: 10.5 },
    ]);

    const { series } = pivots.calculate(data, indicatorConfig('pivots', { lookback: 3 }));

    const v = series![3]!;
    const high = 12;
    const low = 8;
    const close = 11;
    const pp = (high + low + close) / 3;
    expect(v.pp).toBeCloseTo(pp);
    expect(v.r1).toBeCloseTo(2 * pp - low);
    expect(v.s1).toBeCloseTo(2 * pp - high);
    expect(v.r2).toBeCloseTo(pp + (high - low));
    expect(v.s2).toBeCloseTo(pp - (high - low));
    expect(v.r3).toBeCloseTo(high + 2 * (pp - low));
    expect(v.s3).toBeCloseTo(low - 2 * (high - pp));
  });

  describe('kinds', () => {
    // The window: open 10 (its first bar), high 12, low 8; close 11 the bar before.
    const data = ohlcBars([
      { o: 10, h: 12, l: 8, c: 9 },
      { o: 9, h: 11, l: 8.5, c: 10 },
      { o: 10, h: 11, l: 9, c: 11 },
      { o: 11, h: 11, l: 10, c: 10.5 },
    ]);
    const at = (type: string) => pivots.calculate(data, indicatorConfig('pivots', { lookback: 3, type })).series![3]!;
    const pp = (12 + 8 + 11) / 3;

    it('Fibonacci: the range at 0.382, 0.618 and 1 from the pivot', () => {
      const v = at('fibonacci');
      expect(v.pp).toBeCloseTo(pp);
      expect(v.r1).toBeCloseTo(pp + 0.382 * 4);
      expect(v.s2).toBeCloseTo(pp - 0.618 * 4);
      expect(v.r3).toBeCloseTo(pp + 4);
    });

    it('Woodie: the close counted twice in the pivot', () => {
      const v = at('woodie');
      const wp = (12 + 8 + 2 * 11) / 4;
      expect(v.pp).toBeCloseTo(wp);
      expect(v.r1).toBeCloseTo(2 * wp - 8);
      expect(v.s2).toBeCloseTo(wp - 4);
    });

    it('Classic: the third levels two ranges from the pivot', () => {
      const v = at('classic');
      expect(v.r2).toBeCloseTo(pp + 4);
      expect(v.r3).toBeCloseTo(pp + 8);
      expect(v.s3).toBeCloseTo(pp - 8);
    });

    it('Camarilla: from the close, by 1.1 of the range over 12, 6 and 4', () => {
      const v = at('camarilla');
      expect(v.r1).toBeCloseTo(11 + (4 * 1.1) / 12);
      expect(v.s2).toBeCloseTo(11 - (4 * 1.1) / 6);
      expect(v.r3).toBeCloseTo(11 + (4 * 1.1) / 4);
    });

    it('DeMark: one level either side, weighted by where the close is against the open', () => {
      const v = at('dm');
      // Close 11 over open 10: X = 2·high + low + close.
      const x = 2 * 12 + 8 + 11;
      expect(v.pp).toBeCloseTo(x / 4);
      expect(v.r1).toBeCloseTo(x / 2 - 8);
      expect(v.s1).toBeCloseTo(x / 2 - 12);
      expect(v.r2).toBeUndefined();
      expect(v.s3).toBeUndefined();
    });

    it('DeMark: the low counted twice after a down window, the close twice after a flat one', () => {
      const window = (open: number, close: number) =>
        pivots.calculate(ohlcBars([{ o: open, h: 12, l: 8, c: 9 }, { o: 9, h: 11, l: 8.5, c: close }, { o: 10, h: 11, l: 9, c: 9 }]), indicatorConfig('pivots', { lookback: 2, type: 'dm' })).series![2]!;
      expect(window(11, 9).pp).toBeCloseTo((12 + 2 * 8 + 9) / 4);
      expect(window(9, 9).pp).toBeCloseTo((12 + 8 + 2 * 9) / 4);
    });
  });

  it('preserves the canonical ordering s3 < s2 < s1 < pp < r1 < r2 < r3', () => {
    const data = ohlcBars(
      Array.from({ length: 30 }, (_, i) => ({
        o: 100 + i,
        h: 105 + i,
        l: 95 + i,
        c: 102 + i,
      })),
    );
    const { series } = pivots.calculate(
      data,
      indicatorConfig('pivots', { lookback: 5 }),
    );
    const v = series![29]!;
    expect(v.s3!).toBeLessThan(v.s2!);
    expect(v.s2!).toBeLessThan(v.s1!);
    expect(v.s1!).toBeLessThan(v.pp!);
    expect(v.pp!).toBeLessThan(v.r1!);
    expect(v.r1!).toBeLessThan(v.r2!);
    expect(v.r2!).toBeLessThan(v.r3!);
  });

  it('first non-null index equals lookback', () => {
    const data = ohlcBars(
      Array.from({ length: 30 }, () => ({ o: 10, h: 12, l: 8, c: 11 })),
    );
    const { series } = pivots.calculate(
      data,
      indicatorConfig('pivots', { lookback: 7 }),
    );
    const firstIdx = series!.findIndex((v) => v !== null);
    expect(firstIdx).toBe(7);
  });

  it('clamps lookback to at least 1', () => {
    const data = ohlcBars([
      { o: 10, h: 12, l: 8, c: 9 },
      { o: 9, h: 13, l: 7, c: 11 },
    ]);
    const { series } = pivots.calculate(
      data,
      indicatorConfig('pivots', { lookback: 0 }),
    );
    expect(series![1]).not.toBeNull();
  });
});
