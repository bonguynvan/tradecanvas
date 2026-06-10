import { describe, it, expect } from 'vitest';
import type { DataSeries, IndicatorConfig } from '@tradecanvas/commons';
import { ChandelierExitIndicator } from '../overlay/ChandelierExit.js';

function bar(high: number, low: number, close: number): DataSeries[number] {
  return { time: 0, open: low, high, low, close, volume: 1 };
}

const cfg: IndicatorConfig =
  { id: 'chandelier', instanceId: 'ce-1', params: { period: 5, multiplier: 3 }, visible: true } as IndicatorConfig;

describe('ChandelierExitIndicator', () => {
  const ind = new ChandelierExitIndicator();

  it('is null until there are more than `period` bars', () => {
    const data: DataSeries = Array.from({ length: 4 }, (_, i) => bar(10 + i, 9 + i, 9.5 + i));
    expect(ind.calculate(data, cfg).series.every((v) => v === null)).toBe(true);
  });

  it('puts the long exit below the highest high and short exit above the lowest low', () => {
    const data: DataSeries = [
      bar(10, 8, 9), bar(12, 9, 11), bar(14, 11, 13), bar(13, 10, 12),
      bar(15, 12, 14), bar(16, 13, 15), bar(15, 12, 14),
    ];
    const out = ind.calculate(data, cfg);
    const last = out.series[out.series.length - 1]!;
    const hh = Math.max(...data.slice(-5).map((b) => b.high)); // 16
    const ll = Math.min(...data.slice(-5).map((b) => b.low));  // 10
    expect(last.long).toBeLessThan(hh);
    expect(last.short).toBeGreaterThan(ll);
    expect(last.long).toBeLessThan(last.short!);
  });

  it('widens the gap with a larger multiplier', () => {
    const data: DataSeries = Array.from({ length: 12 }, (_, i) => bar(10 + (i % 3), 8 + (i % 2), 9 + (i % 2)));
    const tight = ind.calculate(data, { ...cfg, params: { period: 5, multiplier: 1 } } as IndicatorConfig).series.at(-1)!;
    const wide = ind.calculate(data, { ...cfg, params: { period: 5, multiplier: 5 } } as IndicatorConfig).series.at(-1)!;
    expect(wide.long!).toBeLessThan(tight.long!);   // long stop lower with bigger ATR mult
    expect(wide.short!).toBeGreaterThan(tight.short!);
  });
});
