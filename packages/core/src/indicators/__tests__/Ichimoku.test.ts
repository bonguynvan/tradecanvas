import { describe, it, expect } from 'vitest';
import { IchimokuIndicator } from '../overlay/Ichimoku.js';
import { ohlcBars, indicatorConfig } from './fixtures.js';
import { strokeRecorder } from '../../__tests__/strokeRecorder.js';
import { barIndexToX } from '../../viewport/ScaleMapping.js';

describe('IchimokuIndicator', () => {
  const ichimoku = new IchimokuIndicator();
  // No displacement: the lines on the bars they are worked out on.
  const params = { tenkan: 9, kijun: 26, senkou: 52, displacement: 0 };

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

  it('plots the lead lines the displacement ahead of the bars they are worked out on', () => {
    const data = ohlcBars(Array.from({ length: 80 }, (_, i) => ({ o: 100 + i, h: 102 + i + (i % 7), l: 98 + i - (i % 5), c: 100 + i })));
    const flat = ichimoku.calculate(data, indicatorConfig('ichimoku', params)).series!;
    const { series } = ichimoku.calculate(data, indicatorConfig('ichimoku', { ...params, displacement: 26 }));
    expect(series![60]!.senkouA).toBe(flat[34]!.senkouA);
    expect(series![79]!.senkouB).toBe(flat[53]!.senkouB);
    // The conversion and base lines stay where they are worked out.
    expect(series![60]!.tenkan).toBe(flat[60]!.tenkan);
    expect(series![30]?.senkouA).toBeUndefined();
  });

  it('keeps the cloud of the last bars for the bars ahead of the latest', () => {
    const data = ohlcBars(Array.from({ length: 80 }, (_, i) => ({ o: 100 + i, h: 102 + i, l: 98 + i, c: 100 + i })));
    const flat = ichimoku.calculate(data, indicatorConfig('ichimoku', params)).series!;
    const out = ichimoku.calculate(data, indicatorConfig('ichimoku', { ...params, displacement: 26 }));
    const ahead = out.meta!.ahead as { senkouA?: number; senkouB?: number }[];
    expect(ahead).toHaveLength(26);
    expect(ahead[0].senkouA).toBe(flat[54]!.senkouA);
    expect(ahead[25].senkouB).toBe(flat[79]!.senkouB);
  });

  it('draws the cloud past the latest bar', () => {
    const data = ohlcBars(Array.from({ length: 80 }, (_, i) => ({ o: 100 + i, h: 102 + i, l: 98 + i, c: 100 + i })));
    const output = ichimoku.calculate(data, indicatorConfig('ichimoku', { ...params, displacement: 26 }));
    // 80 bars of 10px in a 1200px plot: the 26 ahead fit to the right of the last.
    const viewport = {
      visibleRange: { from: 0, to: 79 }, priceRange: { min: 50, max: 250 },
      barWidth: 8, barSpacing: 2, offset: 0, chartRect: { x: 0, y: 0, width: 1200, height: 400 },
    };
    const rec = strokeRecorder();
    ichimoku.render(rec.ctx, output, viewport, { colors: ['#111111', '#222222', '#333333', '#444444', '#555555'], lineWidths: [1], opacity: 1 });
    const leadA = rec.strokes.find((s) => s.color === '#333333')!;
    const xs = leadA.segments.flatMap(([x1, , x2]) => [x1, x2]);
    expect(Math.max(...xs)).toBeCloseTo(barIndexToX(105, viewport));
  });

  it('puts the cloud the displacement on when there are fewer bars than that', () => {
    const data = ohlcBars(Array.from({ length: 20 }, (_, i) => ({ o: 100 + i, h: 102 + i, l: 98 + i, c: 100 + i })));
    const out = ichimoku.calculate(data, indicatorConfig('ichimoku', { tenkan: 3, kijun: 5, senkou: 8, displacement: 26 }));
    expect(out.meta!.aheadFrom).toBe(26);
    expect(out.meta!.ahead).toHaveLength(20);
    expect(out.series!.some((v) => v?.senkouA !== undefined)).toBe(false);
  });
});
