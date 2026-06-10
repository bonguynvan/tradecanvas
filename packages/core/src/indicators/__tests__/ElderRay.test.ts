import { describe, it, expect } from 'vitest';
import type { DataSeries, IndicatorConfig } from '@tradecanvas/commons';
import { ElderRayIndicator } from '../panel/ElderRay.js';

function bar(high: number, low: number, close: number): DataSeries[number] {
  return { time: 0, open: close, high, low, close, volume: 1 };
}

const cfg: IndicatorConfig =
  { id: 'elderray', instanceId: 'er-1', params: { period: 5 }, visible: true } as IndicatorConfig;

describe('ElderRayIndicator', () => {
  const ind = new ElderRayIndicator();

  it('is null until the EMA seed period passes', () => {
    const data: DataSeries = Array.from({ length: 3 }, (_, i) => bar(10 + i, 9 + i, 9.5 + i));
    expect(ind.calculate(data, cfg).series.every((v) => v === null)).toBe(true);
  });

  it('bull power is positive and exceeds bear power in an uptrend', () => {
    const data: DataSeries = Array.from({ length: 20 }, (_, i) => bar(11 + i, 9 + i, 10.5 + i));
    const out = ind.calculate(data, cfg);
    const last = out.series[out.series.length - 1]!;
    expect(last.bull).toBeGreaterThan(0);
    expect(last.bull!).toBeGreaterThan(last.bear!);
  });

  it('bear power goes negative in a downtrend', () => {
    const data: DataSeries = Array.from({ length: 20 }, (_, i) => bar(51 - i, 49 - i, 50 - i));
    const out = ind.calculate(data, cfg);
    const last = out.series[out.series.length - 1]!;
    expect(last.bear).toBeLessThan(0);
  });

  it('bull >= bear by construction (high >= low)', () => {
    const data: DataSeries = Array.from({ length: 30 }, (_, i) => bar(10 + (i % 4), 8 + (i % 3), 9 + (i % 2)));
    for (const v of ind.calculate(data, cfg).series) {
      if (v) expect(v.bull!).toBeGreaterThanOrEqual(v.bear!);
    }
  });
});
