import { describe, it, expect } from 'vitest';
import type { DataSeries, IndicatorConfig } from '@tradecanvas/commons';
import { FisherTransformIndicator } from '../panel/FisherTransform.js';

function bar(high: number, low: number): DataSeries[number] {
  const m = (high + low) / 2;
  return { time: 0, open: m, high, low, close: m, volume: 1 };
}

const cfg: IndicatorConfig =
  { id: 'fisher', instanceId: 'f-1', params: { period: 9 }, visible: true } as IndicatorConfig;

describe('FisherTransformIndicator', () => {
  const ind = new FisherTransformIndicator();

  it('is null until the period warms up', () => {
    const data: DataSeries = Array.from({ length: 5 }, (_, i) => bar(11 + i, 9 + i));
    expect(ind.calculate(data, cfg).series.every((v) => v === null)).toBe(true);
  });

  it('emits a value and a one-bar-lagged trigger', () => {
    const data: DataSeries = Array.from({ length: 30 }, (_, i) => bar(11 + i, 9 + i));
    const out = ind.calculate(data, cfg);
    const lastIdx = out.series.length - 1;
    const last = out.series[lastIdx]!;
    const prev = out.series[lastIdx - 1]!;
    expect(Number.isFinite(last.value!)).toBe(true);
    // Trigger is the previous bar's Fisher value.
    expect(last.trigger).toBeCloseTo(prev.value!, 10);
  });

  it('pushes positive at the top of a strong up-move', () => {
    const data: DataSeries = Array.from({ length: 30 }, (_, i) => bar(11 + i, 9 + i));
    const last = ind.calculate(data, cfg).series.at(-1)!;
    expect(last.value).toBeGreaterThan(0);
  });

  it('stays finite (clamps the log singularity)', () => {
    // Flat then a jump — extreme normalization shouldn't blow up.
    const data: DataSeries = [
      ...Array.from({ length: 15 }, () => bar(10, 10)),
      ...Array.from({ length: 15 }, () => bar(20, 20)),
    ];
    for (const v of ind.calculate(data, cfg).series) {
      if (v?.value !== undefined) expect(Number.isFinite(v.value)).toBe(true);
    }
  });
});
