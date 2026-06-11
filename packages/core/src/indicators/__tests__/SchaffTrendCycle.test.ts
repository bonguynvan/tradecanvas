import { describe, it, expect } from 'vitest';
import type { DataSeries, IndicatorConfig } from '@tradecanvas/commons';
import { SchaffTrendCycleIndicator } from '../panel/SchaffTrendCycle.js';

function bar(close: number): DataSeries[number] {
  return { time: 0, open: close, high: close, low: close, close, volume: 1 };
}

const cfg: IndicatorConfig =
  { id: 'stc', instanceId: 'stc-1', params: { fast: 23, slow: 50, cycle: 10 }, visible: true } as IndicatorConfig;

describe('SchaffTrendCycleIndicator', () => {
  const ind = new SchaffTrendCycleIndicator();

  it('stays within 0..100', () => {
    const data: DataSeries = Array.from({ length: 200 }, (_, i) => bar(100 + Math.sin(i / 8) * 15));
    for (const v of ind.calculate(data, cfg).series) {
      if (v?.value !== undefined) {
        expect(v.value).toBeGreaterThanOrEqual(0);
        expect(v.value).toBeLessThanOrEqual(100);
      }
    }
  });

  it('cycles through both extremes on an oscillating market', () => {
    // Over alternating up/down legs the trend cycle should reach overbought and
    // oversold rather than sitting mid-range.
    const data: DataSeries = Array.from({ length: 400 }, (_, i) => bar(100 + Math.sin(i / 12) * 20));
    const out = ind.calculate(data, cfg);
    const vals = out.series.filter((v) => v?.value !== undefined).map((v) => v!.value!);
    expect(Math.max(...vals)).toBeGreaterThan(75);
    expect(Math.min(...vals)).toBeLessThan(25);
  });

  it('handles short series without emitting', () => {
    const data: DataSeries = Array.from({ length: 15 }, (_, i) => bar(100 + i));
    expect(ind.calculate(data, cfg).series.every((v) => v === null)).toBe(true);
  });
});
