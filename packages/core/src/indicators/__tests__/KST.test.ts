import { describe, it, expect } from 'vitest';
import type { DataSeries, IndicatorConfig } from '@tradecanvas/commons';
import { KSTIndicator } from '../panel/KST.js';

function bar(close: number): DataSeries[number] {
  return { time: 0, open: close, high: close, low: close, close, volume: 1 };
}

const cfg: IndicatorConfig =
  { id: 'kst', instanceId: 'kst-1', params: {}, visible: true } as IndicatorConfig;

describe('KSTIndicator', () => {
  const ind = new KSTIndicator();

  it('is null until the longest ROC+SMA window warms up', () => {
    const data: DataSeries = Array.from({ length: 30 }, (_, i) => bar(100 + i));
    expect(ind.calculate(data, cfg).series.every((v) => v === null)).toBe(true);
  });

  it('is positive in a sustained uptrend and carries a signal line', () => {
    const data: DataSeries = Array.from({ length: 80 }, (_, i) => bar(100 * 1.01 ** i));
    const out = ind.calculate(data, cfg);
    const last = out.series[out.series.length - 1]!;
    expect(last.value).toBeGreaterThan(0);
    expect(last.signal).toBeDefined();
  });

  it('is negative in a sustained downtrend', () => {
    const data: DataSeries = Array.from({ length: 80 }, (_, i) => bar(100 * 0.99 ** i));
    const out = ind.calculate(data, cfg);
    const last = out.series[out.series.length - 1]!;
    expect(last.value).toBeLessThan(0);
  });

  it('produces finite values', () => {
    const data: DataSeries = Array.from({ length: 100 }, (_, i) => bar(100 + Math.sin(i / 5) * 8));
    for (const v of ind.calculate(data, cfg).series) {
      if (v?.value !== undefined) expect(Number.isFinite(v.value)).toBe(true);
    }
  });
});
