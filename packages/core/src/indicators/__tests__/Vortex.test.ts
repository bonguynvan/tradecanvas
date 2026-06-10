import { describe, it, expect } from 'vitest';
import type { DataSeries, IndicatorConfig } from '@tradecanvas/commons';
import { VortexIndicator } from '../panel/Vortex.js';

function bar(high: number, low: number, close: number): DataSeries[number] {
  return { time: 0, open: low, high, low, close, volume: 1 };
}

const cfg = (period: number): IndicatorConfig =>
  ({ id: 'vortex', instanceId: 'v-1', params: { period }, visible: true } as IndicatorConfig);

describe('VortexIndicator', () => {
  const ind = new VortexIndicator();

  it('is null until there are more than `period` bars', () => {
    const data: DataSeries = [bar(2, 1, 1.5), bar(3, 2, 2.5)];
    const out = ind.calculate(data, cfg(5));
    expect(out.series.every((v) => v === null)).toBe(true);
  });

  it('VI+ dominates in a clean uptrend', () => {
    // Steadily rising bars → VM+ (|high − prevLow|) >> VM− (|low − prevHigh|).
    const data: DataSeries = [];
    for (let i = 0; i < 10; i++) data.push(bar(10 + i, 9 + i, 9.5 + i));
    const out = ind.calculate(data, cfg(3));
    const last = out.series[out.series.length - 1]!;
    expect(last.viPlus).toBeGreaterThan(last.viMinus!);
    expect(last.viPlus).toBeGreaterThan(1);
  });

  it('VI- dominates in a clean downtrend', () => {
    const data: DataSeries = [];
    for (let i = 0; i < 10; i++) data.push(bar(20 - i, 19 - i, 19.5 - i));
    const out = ind.calculate(data, cfg(3));
    const last = out.series[out.series.length - 1]!;
    expect(last.viMinus).toBeGreaterThan(last.viPlus!);
  });

  it('produces positive finite values', () => {
    const data: DataSeries = [];
    for (let i = 0; i < 20; i++) data.push(bar(10 + (i % 3), 8 + (i % 2), 9 + (i % 2)));
    const out = ind.calculate(data, cfg(14));
    const last = out.series[out.series.length - 1]!;
    expect(Number.isFinite(last.viPlus!)).toBe(true);
    expect(last.viPlus!).toBeGreaterThan(0);
    expect(last.viMinus!).toBeGreaterThan(0);
  });
});
