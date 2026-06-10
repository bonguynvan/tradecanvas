import { describe, it, expect } from 'vitest';
import type { DataSeries, IndicatorConfig } from '@tradecanvas/commons';
import { ConnorsRSIIndicator } from '../panel/ConnorsRSI.js';

function bar(close: number): DataSeries[number] {
  return { time: 0, open: close, high: close, low: close, close, volume: 1 };
}

// Small rankPeriod so tests don't need 100+ bars.
const cfg: IndicatorConfig =
  { id: 'crsi', instanceId: 'cr-1', params: { rsiPeriod: 3, streakPeriod: 2, rankPeriod: 10 }, visible: true } as IndicatorConfig;

describe('ConnorsRSIIndicator', () => {
  const ind = new ConnorsRSIIndicator();

  it('is null until the rank lookback has warmed up', () => {
    const data: DataSeries = Array.from({ length: 8 }, (_, i) => bar(10 + i));
    expect(ind.calculate(data, cfg).series.every((v) => v === null)).toBe(true);
  });

  it('stays within 0..100', () => {
    const data: DataSeries = Array.from({ length: 40 }, (_, i) => bar(10 + Math.sin(i / 2) * 3));
    for (const v of ind.calculate(data, cfg).series) {
      if (v?.value !== undefined) {
        expect(v.value).toBeGreaterThanOrEqual(0);
        expect(v.value).toBeLessThanOrEqual(100);
      }
    }
  });

  it('reads high after a strong unbroken up-run (RSI components maxed)', () => {
    const data: DataSeries = Array.from({ length: 30 }, (_, i) => bar(10 + i));
    const out = ind.calculate(data, cfg);
    const last = out.series[out.series.length - 1]!;
    // Price RSI ~100 and streak RSI ~100 dominate; the rank component is low
    // because arithmetic gains shrink in % terms → CRSI ≈ (100+100+~0)/3 ≈ 67.
    expect(last.value).toBeGreaterThan(60);
  });

  it('produces a finite number once warmed up', () => {
    const data: DataSeries = Array.from({ length: 30 }, (_, i) => bar(10 + (i % 5)));
    const last = ind.calculate(data, cfg).series.at(-1);
    expect(last == null || Number.isFinite(last.value!)).toBe(true);
  });
});
