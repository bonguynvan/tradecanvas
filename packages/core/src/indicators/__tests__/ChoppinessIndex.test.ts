import { describe, it, expect } from 'vitest';
import type { DataSeries, IndicatorConfig } from '@tradecanvas/commons';
import { ChoppinessIndexIndicator } from '../panel/ChoppinessIndex.js';

function bar(high: number, low: number, close: number): DataSeries[number] {
  return { time: 0, open: low, high, low, close, volume: 1 };
}

const cfg = (period: number): IndicatorConfig =>
  ({ id: 'chop', instanceId: 'c-1', params: { period }, visible: true } as IndicatorConfig);

describe('ChoppinessIndexIndicator', () => {
  const ind = new ChoppinessIndexIndicator();

  it('is null until there are more than `period` bars', () => {
    const data: DataSeries = [bar(2, 1, 1.5), bar(3, 2, 2.5)];
    expect(ind.calculate(data, cfg(5)).series.every((v) => v === null)).toBe(true);
  });

  it('reads low (trending) for a clean directional move', () => {
    // Strong uptrend: total range ≈ sum of true ranges → CHOP near 0.
    const data: DataSeries = [];
    for (let i = 0; i < 12; i++) data.push(bar(10 + i, 9 + i, 10 + i));
    const out = ind.calculate(data, cfg(5));
    const last = out.series[out.series.length - 1]!;
    expect(last.value).toBeLessThan(38.2);
  });

  it('reads high (choppy) for a tight oscillating range', () => {
    // Price ping-pongs in a fixed band: many TR but small net range → high CHOP.
    const data: DataSeries = [];
    for (let i = 0; i < 30; i++) {
      const up = i % 2 === 0;
      data.push(bar(11, 9, up ? 10.8 : 9.2));
    }
    const out = ind.calculate(data, cfg(14));
    const last = out.series[out.series.length - 1]!;
    expect(last.value).toBeGreaterThan(61.8);
  });

  it('clamps into 0..100', () => {
    const data: DataSeries = [];
    for (let i = 0; i < 20; i++) data.push(bar(10 + (i % 4), 8 + (i % 3), 9 + (i % 2)));
    for (const v of ind.calculate(data, cfg(14)).series) {
      if (v?.value !== undefined) {
        expect(v.value).toBeGreaterThanOrEqual(0);
        expect(v.value).toBeLessThanOrEqual(100);
      }
    }
  });
});
