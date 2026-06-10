import { describe, it, expect } from 'vitest';
import type { DataSeries, IndicatorConfig } from '@tradecanvas/commons';
import { UltimateOscillatorIndicator } from '../panel/UltimateOscillator.js';

function bar(high: number, low: number, close: number): DataSeries[number] {
  return { time: 0, open: low, high, low, close, volume: 1 };
}

const cfg: IndicatorConfig =
  { id: 'uo', instanceId: 'uo-1', params: { fast: 7, mid: 14, slow: 28 }, visible: true } as IndicatorConfig;

describe('UltimateOscillatorIndicator', () => {
  const ind = new UltimateOscillatorIndicator();

  it('is null until there are more than `slow` bars', () => {
    const data: DataSeries = Array.from({ length: 20 }, (_, i) => bar(10 + i, 9 + i, 9.5 + i));
    expect(ind.calculate(data, cfg).series.every((v) => v === null)).toBe(true);
  });

  it('stays within 0..100', () => {
    const data: DataSeries = Array.from({ length: 60 }, (_, i) =>
      bar(10 + (i % 5), 8 + (i % 3), 9 + (i % 4)),
    );
    for (const v of ind.calculate(data, cfg).series) {
      if (v?.value !== undefined) {
        expect(v.value).toBeGreaterThanOrEqual(0);
        expect(v.value).toBeLessThanOrEqual(100);
      }
    }
  });

  it('reads high in a steady uptrend (buying pressure dominant)', () => {
    const data: DataSeries = Array.from({ length: 40 }, (_, i) => bar(10 + i, 9 + i, 10 + i));
    const out = ind.calculate(data, cfg);
    const last = out.series[out.series.length - 1]!;
    expect(last.value).toBeGreaterThan(70);
  });

  it('reads low in a steady downtrend', () => {
    const data: DataSeries = Array.from({ length: 40 }, (_, i) => bar(50 - i, 49 - i, 49 - i));
    const out = ind.calculate(data, cfg);
    const last = out.series[out.series.length - 1]!;
    expect(last.value).toBeLessThan(30);
  });
});
