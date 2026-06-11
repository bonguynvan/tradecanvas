import { describe, it, expect } from 'vitest';
import type { DataSeries, IndicatorConfig } from '@tradecanvas/commons';
import { AlligatorIndicator } from '../overlay/Alligator.js';

function bar(high: number, low: number): DataSeries[number] {
  const m = (high + low) / 2;
  return { time: 0, open: m, high, low, close: m, volume: 1 };
}

const cfg: IndicatorConfig =
  { id: 'alligator', instanceId: 'al-1', params: {}, visible: true } as IndicatorConfig;

describe('AlligatorIndicator', () => {
  const ind = new AlligatorIndicator();

  it('emits no values for a series shorter than the fastest (lips) window', () => {
    const data: DataSeries = Array.from({ length: 4 }, (_, i) => bar(11 + i, 9 + i));
    expect(ind.calculate(data, cfg).series.every((v) => v === null)).toBe(true);
  });

  it('orders lips > teeth > jaw in a steady uptrend (faster MA leads)', () => {
    const data: DataSeries = Array.from({ length: 80 }, (_, i) => bar(11 + i, 9 + i));
    const out = ind.calculate(data, cfg);
    // Find a confirmed bar with all three lines present.
    const withAll = out.series.filter((v) => v && v.jaw !== undefined && v.teeth !== undefined && v.lips !== undefined);
    expect(withAll.length).toBeGreaterThan(0);
    const v = withAll[withAll.length - 1]!;
    expect(v.lips!).toBeGreaterThan(v.teeth!);
    expect(v.teeth!).toBeGreaterThan(v.jaw!);
  });

  it('displaces faster lines so lips begin before jaw', () => {
    const data: DataSeries = Array.from({ length: 80 }, (_, i) => bar(11 + i, 9 + i));
    const out = ind.calculate(data, cfg);
    const firstLips = out.series.findIndex((v) => v?.lips !== undefined);
    const firstJaw = out.series.findIndex((v) => v?.jaw !== undefined);
    // lips: (5−1)+3 = 7;  jaw: (13−1)+8 = 20.
    expect(firstLips).toBe(7);
    expect(firstJaw).toBe(20);
    expect(firstLips).toBeLessThan(firstJaw);
  });
});
