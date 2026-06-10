import { describe, it, expect } from 'vitest';
import type { DataSeries, IndicatorConfig } from '@tradecanvas/commons';
import { CoppockIndicator } from '../panel/Coppock.js';

function bar(close: number): DataSeries[number] {
  return { time: 0, open: close, high: close, low: close, close, volume: 1 };
}

const cfg: IndicatorConfig =
  { id: 'coppock', instanceId: 'cp-1', params: { longRoc: 14, shortRoc: 11, wma: 10 }, visible: true } as IndicatorConfig;

describe('CoppockIndicator', () => {
  const ind = new CoppockIndicator();

  it('is null until ROC + WMA windows warm up', () => {
    const data: DataSeries = Array.from({ length: 20 }, (_, i) => bar(100 + i));
    expect(ind.calculate(data, cfg).series.every((v) => v === null)).toBe(true);
  });

  it('is positive during a sustained rally', () => {
    const data: DataSeries = Array.from({ length: 50 }, (_, i) => bar(100 * 1.01 ** i));
    const out = ind.calculate(data, cfg);
    const last = out.series[out.series.length - 1]!;
    expect(last.value).toBeGreaterThan(0);
  });

  it('is negative during a sustained decline', () => {
    const data: DataSeries = Array.from({ length: 50 }, (_, i) => bar(100 * 0.99 ** i));
    const out = ind.calculate(data, cfg);
    const last = out.series[out.series.length - 1]!;
    expect(last.value).toBeLessThan(0);
  });

  it('produces finite values', () => {
    const data: DataSeries = Array.from({ length: 60 }, (_, i) => bar(100 + Math.sin(i / 3) * 10));
    for (const v of ind.calculate(data, cfg).series) {
      if (v?.value !== undefined) expect(Number.isFinite(v.value)).toBe(true);
    }
  });
});
