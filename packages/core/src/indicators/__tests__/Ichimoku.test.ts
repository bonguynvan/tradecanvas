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
    expect(series![params.tenkan - 2]?.tenkan).toBeUndefined();
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

  it('plots the lagging span, the close, the displacement back', () => {
    const data = ohlcBars(
      Array.from({ length: 40 }, (_, i) => ({
        o: 100 + i,
        h: 102 + i,
        l: 98 + i,
        c: 100 + i,
      })),
    );
    const { series } = ichimoku.calculate(data, indicatorConfig('ichimoku', { ...params, displacement: 26 }));
    expect(series![0]!.chikou).toBe(data[26].close);
    expect(series![13]!.chikou).toBe(data[39].close);
    // The last 26 bars have no close 26 bars on to show yet.
    expect(series![14]?.chikou).toBeUndefined();
    expect(series![39]?.chikou).toBeUndefined();
  });

  it('shifts the lagging span by the displacement it is given', () => {
    const data = ohlcBars(Array.from({ length: 40 }, (_, i) => ({ o: 100 + i, h: 102 + i, l: 98 + i, c: 100 + i })));
    const { series } = ichimoku.calculate(data, indicatorConfig('ichimoku', { ...params, displacement: 10 }));
    expect(series![5]!.chikou).toBe(data[15].close);
    expect(series![30]?.chikou).toBeUndefined();
  });

  it('declares the lagging span as a line of its own colour', () => {
    const chikou = ichimoku.descriptor.plots!.find((p) => p.key === 'chikou');
    expect(chikou).toBeDefined();
    const others = ichimoku.descriptor.plots!.filter((p) => p.key !== 'chikou').map((p) => p.color);
    expect(others).not.toContain(chikou!.color);
  });
});
