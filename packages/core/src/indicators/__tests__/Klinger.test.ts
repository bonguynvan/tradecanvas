import { describe, it, expect } from 'vitest';
import type { DataSeries, IndicatorConfig } from '@tradecanvas/commons';
import { KlingerIndicator } from '../panel/Klinger.js';

function bar(high: number, low: number, close: number, volume: number): DataSeries[number] {
  return { time: 0, open: close, high, low, close, volume };
}

const cfg: IndicatorConfig =
  { id: 'kvo', instanceId: 'kvo-1', params: { fast: 5, slow: 10, signal: 3 }, visible: true } as IndicatorConfig;

describe('KlingerIndicator', () => {
  const ind = new KlingerIndicator();

  it('is null until past the slow window', () => {
    const data: DataSeries = Array.from({ length: 6 }, (_, i) => bar(11 + i, 9 + i, 10 + i, 100));
    expect(ind.calculate(data, cfg).series.every((v) => v === null)).toBe(true);
  });

  it('emits a value and signal once warmed up', () => {
    const data: DataSeries = Array.from({ length: 30 }, (_, i) => bar(11 + i, 9 + i, 10 + i, 100 + (i % 5) * 10));
    const out = ind.calculate(data, cfg);
    const last = out.series[out.series.length - 1]!;
    expect(last).not.toBeNull();
    expect(Number.isFinite(last.value!)).toBe(true);
    expect(last.signal).toBeDefined();
  });

  it('trends positive when rising bars carry rising volume', () => {
    const data: DataSeries = Array.from({ length: 40 }, (_, i) => bar(11 + i, 9 + i, 11 + i, 100 + i * 5));
    const out = ind.calculate(data, cfg);
    const last = out.series[out.series.length - 1]!;
    expect(last.value).toBeGreaterThan(0);
  });

  it('produces finite values throughout', () => {
    const data: DataSeries = Array.from({ length: 50 }, (_, i) =>
      bar(10 + (i % 4), 8 + (i % 3), 9 + (i % 2), 100 + (i % 7) * 20),
    );
    for (const v of ind.calculate(data, cfg).series) {
      if (v?.value !== undefined) expect(Number.isFinite(v.value)).toBe(true);
    }
  });
});
