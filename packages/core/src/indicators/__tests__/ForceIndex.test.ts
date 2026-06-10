import { describe, it, expect } from 'vitest';
import type { DataSeries, IndicatorConfig } from '@tradecanvas/commons';
import { ForceIndexIndicator } from '../panel/ForceIndex.js';

function bar(close: number, volume: number): DataSeries[number] {
  return { time: 0, open: close, high: close, low: close, close, volume };
}

const cfg = (period: number): IndicatorConfig =>
  ({ id: 'fi', instanceId: 'fi-1', params: { period }, visible: true } as IndicatorConfig);

describe('ForceIndexIndicator', () => {
  const ind = new ForceIndexIndicator();

  it('returns empty-ish until the EMA has seeded `period` bars', () => {
    const data: DataSeries = [bar(10, 100), bar(11, 100), bar(12, 100)];
    // period 5 → needs index >= 5, only 3 bars → all null.
    expect(ind.calculate(data, cfg(5)).series.every((v) => v === null)).toBe(true);
  });

  it('is positive while price rises on volume', () => {
    const data: DataSeries = Array.from({ length: 20 }, (_, i) => bar(10 + i, 100));
    const out = ind.calculate(data, cfg(5));
    const last = out.series[out.series.length - 1]!;
    expect(last.value).toBeGreaterThan(0);
  });

  it('is negative while price falls on volume', () => {
    const data: DataSeries = Array.from({ length: 20 }, (_, i) => bar(50 - i, 100));
    const out = ind.calculate(data, cfg(5));
    const last = out.series[out.series.length - 1]!;
    expect(last.value).toBeLessThan(0);
  });

  it('scales with volume (more volume → larger magnitude)', () => {
    const lowVol = ind.calculate(Array.from({ length: 20 }, (_, i) => bar(10 + i, 100)), cfg(3));
    const highVol = ind.calculate(Array.from({ length: 20 }, (_, i) => bar(10 + i, 1000)), cfg(3));
    const a = lowVol.series.at(-1)!.value!;
    const b = highVol.series.at(-1)!.value!;
    expect(b).toBeGreaterThan(a);
  });
});
