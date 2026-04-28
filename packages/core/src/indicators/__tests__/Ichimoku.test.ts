import { describe, it, expect } from 'vitest';
import { IchimokuIndicator } from '../overlay/Ichimoku.js';
import { ohlcBars, indicatorConfig } from './fixtures.js';

describe('IchimokuIndicator', () => {
  const ichimoku = new IchimokuIndicator();
  const params = { tenkan: 9, kijun: 26, senkou: 52 };

  it('emits tenkan once tenkan period bars are available', () => {
    const data = ohlcBars(
      Array.from({ length: 30 }, (_, i) => ({
        o: 100 + i,
        h: 102 + i,
        l: 98 + i,
        c: 100 + i,
      })),
    );
    const { series } = ichimoku.calculate(data, indicatorConfig('ichimoku', params));
    expect(series![params.tenkan - 1]?.tenkan).toBeDefined();
    expect(series![params.tenkan - 2]).toBeNull();
  });

  it('emits kijun and senkouA only after kijun period is reached', () => {
    const data = ohlcBars(
      Array.from({ length: 60 }, (_, i) => ({
        o: 100 + i,
        h: 102 + i,
        l: 98 + i,
        c: 100 + i,
      })),
    );
    const { series } = ichimoku.calculate(data, indicatorConfig('ichimoku', params));
    expect(series![params.kijun - 1]?.kijun).toBeDefined();
    expect(series![params.kijun - 1]?.senkouA).toBeDefined();
    expect(series![params.kijun - 2]?.senkouA).toBeUndefined();
  });

  it('senkouA is the midpoint of tenkan and kijun', () => {
    const data = ohlcBars(
      Array.from({ length: 60 }, (_, i) => ({
        o: 100 + i,
        h: 110 + i,
        l: 95 + i,
        c: 100 + i,
      })),
    );
    const { series } = ichimoku.calculate(data, indicatorConfig('ichimoku', params));
    const last = series![data.length - 1]!;
    expect(last.senkouA!).toBeCloseTo((last.tenkan! + last.kijun!) / 2);
  });

  it('senkouB is the midpoint of the senkou-period high/low', () => {
    const data = ohlcBars(
      Array.from({ length: 60 }, (_, i) => ({
        o: 100,
        h: 100 + (i % 5),
        l: 100 - (i % 5),
        c: 100,
      })),
    );
    const { series } = ichimoku.calculate(data, indicatorConfig('ichimoku', params));
    const last = series![data.length - 1]!;
    // Within the last 52 bars, max high is 104 and min low is 96 → midpoint 100.
    expect(last.senkouB!).toBeCloseTo(100);
  });

  it('chikou tracks the close of the current bar after kijun warmup', () => {
    const data = ohlcBars(
      Array.from({ length: 40 }, (_, i) => ({
        o: 100 + i,
        h: 102 + i,
        l: 98 + i,
        c: 100 + i,
      })),
    );
    const { series } = ichimoku.calculate(data, indicatorConfig('ichimoku', params));
    expect(series![30]!.chikou).toBe(data[30].close);
  });
});
