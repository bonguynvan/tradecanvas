import { describe, it, expect } from 'vitest';
import type { DataSeries, IndicatorConfig } from '@tradecanvas/commons';
import { MassIndexIndicator } from '../panel/MassIndex.js';
import { ChandeMomentumIndicator } from '../panel/ChandeMomentum.js';
import { TRIXIndicator } from '../panel/TRIX.js';

function bar(high: number, low: number, close: number): DataSeries[number] {
  return { time: 0, open: close, high, low, close, volume: 1 };
}
const c = (close: number) => bar(close + 1, close - 1, close);

describe('MassIndex', () => {
  const ind = new MassIndexIndicator();
  const cfg: IndicatorConfig = { id: 'massindex', instanceId: 'm-1', params: { ema: 9, sum: 25 }, visible: true } as IndicatorConfig;

  it('sits near 25 for a constant-range market', () => {
    const data: DataSeries = Array.from({ length: 60 }, () => bar(11, 9, 10));
    const last = ind.calculate(data, cfg).series.at(-1);
    // EMA1 == EMA2 when range is constant → ratio 1 → sum of 25 ≈ 25.
    if (last?.value !== undefined) expect(last.value).toBeCloseTo(25, 5);
  });

  it('rises above 25 when the range expands', () => {
    const data: DataSeries = [
      ...Array.from({ length: 40 }, () => bar(11, 9, 10)),
      ...Array.from({ length: 20 }, (_, i) => bar(10 + i, 10 - i, 10)),
    ];
    const last = ind.calculate(data, cfg).series.at(-1)!;
    expect(last.value).toBeGreaterThan(25);
  });
});

describe('ChandeMomentum', () => {
  const ind = new ChandeMomentumIndicator();
  const cfg: IndicatorConfig = { id: 'cmo', instanceId: 'cmo-1', params: { period: 9 }, visible: true } as IndicatorConfig;

  it('is +100 for an unbroken up-run and −100 for a down-run', () => {
    const up = ind.calculate(Array.from({ length: 20 }, (_, i) => c(10 + i)), cfg).series.at(-1)!;
    const down = ind.calculate(Array.from({ length: 20 }, (_, i) => c(50 - i)), cfg).series.at(-1)!;
    expect(up.value).toBeCloseTo(100, 5);
    expect(down.value).toBeCloseTo(-100, 5);
  });

  it('stays within [-100, 100]', () => {
    const data = Array.from({ length: 40 }, (_, i) => c(10 + Math.sin(i) * 4));
    for (const v of ind.calculate(data, cfg).series) {
      if (v?.value !== undefined) {
        expect(v.value).toBeGreaterThanOrEqual(-100);
        expect(v.value).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('TRIX', () => {
  const ind = new TRIXIndicator();
  const cfg: IndicatorConfig = { id: 'trix', instanceId: 't-1', params: { period: 5, signal: 3 }, visible: true } as IndicatorConfig;

  it('is positive in an uptrend and carries a signal line', () => {
    const data = Array.from({ length: 60 }, (_, i) => c(100 * 1.01 ** i));
    const last = ind.calculate(data, cfg).series.at(-1)!;
    expect(last.value).toBeGreaterThan(0);
    expect(last.signal).toBeDefined();
  });

  it('is negative in a downtrend', () => {
    const data = Array.from({ length: 60 }, (_, i) => c(100 * 0.99 ** i));
    const last = ind.calculate(data, cfg).series.at(-1)!;
    expect(last.value).toBeLessThan(0);
  });
});
