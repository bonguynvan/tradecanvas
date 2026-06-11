import { describe, it, expect } from 'vitest';
import type { DataSeries, IndicatorConfig } from '@tradecanvas/commons';
import { EaseOfMovementIndicator } from '../panel/EaseOfMovement.js';
import { PriceVolumeTrendIndicator } from '../panel/PriceVolumeTrend.js';
import { WilliamsADIndicator } from '../panel/WilliamsAD.js';

function bar(high: number, low: number, close: number, volume = 100): DataSeries[number] {
  return { time: 0, open: close, high, low, close, volume };
}

describe('EaseOfMovement', () => {
  const ind = new EaseOfMovementIndicator();
  const cfg: IndicatorConfig = { id: 'emv', instanceId: 'e-1', params: { period: 5 }, visible: true } as IndicatorConfig;

  it('is null until the period warms up', () => {
    const data: DataSeries = Array.from({ length: 4 }, (_, i) => bar(11 + i, 9 + i, 10 + i));
    expect(ind.calculate(data, cfg).series.every((v) => v === null)).toBe(true);
  });

  it('is positive when price rises easily (low volume)', () => {
    const data: DataSeries = Array.from({ length: 20 }, (_, i) => bar(11 + i, 9 + i, 10 + i, 10));
    const last = ind.calculate(data, cfg).series.at(-1)!;
    expect(last.value).toBeGreaterThan(0);
  });
});

describe('PriceVolumeTrend', () => {
  const ind = new PriceVolumeTrendIndicator();
  const cfg = { id: 'pvt', instanceId: 'p-1', params: {}, visible: true } as IndicatorConfig;

  it('accumulates upward when price and volume both rise', () => {
    const data: DataSeries = Array.from({ length: 10 }, (_, i) => bar(11 + i, 9 + i, 10 + i, 100));
    const s = ind.calculate(data, cfg).series;
    expect(s[0]!.value).toBe(0);
    expect(s.at(-1)!.value!).toBeGreaterThan(0);
  });

  it('falls when price declines', () => {
    const data: DataSeries = Array.from({ length: 10 }, (_, i) => bar(51 - i, 49 - i, 50 - i, 100));
    expect(ind.calculate(data, cfg).series.at(-1)!.value!).toBeLessThan(0);
  });
});

describe('WilliamsAD', () => {
  const ind = new WilliamsADIndicator();
  const cfg = { id: 'wad', instanceId: 'w-1', params: {}, visible: true } as IndicatorConfig;

  it('accumulates on up-closes and distributes on down-closes', () => {
    const upData: DataSeries = Array.from({ length: 10 }, (_, i) => bar(11 + i, 9 + i, 11 + i));
    const downData: DataSeries = Array.from({ length: 10 }, (_, i) => bar(51 - i, 49 - i, 49 - i));
    expect(ind.calculate(upData, cfg).series.at(-1)!.value!).toBeGreaterThan(0);
    expect(ind.calculate(downData, cfg).series.at(-1)!.value!).toBeLessThan(0);
  });

  it('seeds the first bar at 0', () => {
    const data: DataSeries = Array.from({ length: 5 }, (_, i) => bar(11 + i, 9 + i, 10 + i));
    expect(ind.calculate(data, cfg).series[0]!.value).toBe(0);
  });
});
