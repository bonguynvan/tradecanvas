import { describe, it, expect } from 'vitest';
import type { DataSeries, IndicatorConfig } from '@tradecanvas/commons';
import { DisparityIndexIndicator } from '../panel/DisparityIndex.js';
import { QstickIndicator } from '../panel/Qstick.js';
import { PrettyGoodOscillatorIndicator } from '../panel/PrettyGoodOscillator.js';

function bar(open: number, high: number, low: number, close: number, volume = 100): DataSeries[number] {
  return { time: 0, open, high, low, close, volume };
}

describe('DisparityIndex', () => {
  const ind = new DisparityIndexIndicator();
  const cfg = { id: 'disparity', instanceId: 'd-1', params: { period: 10 }, visible: true } as IndicatorConfig;

  it('is null until the period warms up', () => {
    const data: DataSeries = Array.from({ length: 8 }, (_, i) => bar(100 + i, 101 + i, 99 + i, 100 + i));
    expect(ind.calculate(data, cfg).series.every((v) => v === null)).toBe(true);
  });

  it('is positive when price is stretched above its MA (uptrend)', () => {
    const data: DataSeries = Array.from({ length: 30 }, (_, i) => bar(100 + i, 101 + i, 99 + i, 100 + i));
    const last = ind.calculate(data, cfg).series.at(-1)!;
    expect(last.value).toBeGreaterThan(0);
  });

  it('is negative below the MA (downtrend)', () => {
    const data: DataSeries = Array.from({ length: 30 }, (_, i) => bar(200 - i, 201 - i, 199 - i, 200 - i));
    const last = ind.calculate(data, cfg).series.at(-1)!;
    expect(last.value).toBeLessThan(0);
  });
});

describe('Qstick', () => {
  const ind = new QstickIndicator();
  const cfg = { id: 'qstick', instanceId: 'q-1', params: { period: 5 }, visible: true } as IndicatorConfig;

  it('is positive when bars close above their open', () => {
    const data: DataSeries = Array.from({ length: 20 }, (_, i) => bar(100 + i, 103 + i, 99 + i, 102 + i));
    const last = ind.calculate(data, cfg).series.at(-1)!;
    expect(last.value).toBeGreaterThan(0);
  });

  it('is negative when bars close below their open', () => {
    const data: DataSeries = Array.from({ length: 20 }, (_, i) => bar(102 + i, 103 + i, 98 + i, 100 + i));
    const last = ind.calculate(data, cfg).series.at(-1)!;
    expect(last.value).toBeLessThan(0);
  });

  it('is ~0 for doji bars (close == open)', () => {
    const data: DataSeries = Array.from({ length: 20 }, (_, i) => bar(100 + i, 101 + i, 99 + i, 100 + i));
    const last = ind.calculate(data, cfg).series.at(-1)!;
    expect(Math.abs(last.value!)).toBeLessThan(1e-9);
  });
});

describe('PrettyGoodOscillator', () => {
  const ind = new PrettyGoodOscillatorIndicator();
  const cfg = { id: 'pgo', instanceId: 'p-1', params: { period: 14 }, visible: true } as IndicatorConfig;

  it('is null until ATR + SMA warm up', () => {
    const data: DataSeries = Array.from({ length: 14 }, (_, i) => bar(100 + i, 101 + i, 99 + i, 100 + i));
    expect(ind.calculate(data, cfg).series.every((v) => v === null)).toBe(true);
  });

  it('is strongly positive when the close stretches above the MA in ATR units', () => {
    const data: DataSeries = Array.from({ length: 40 }, (_, i) => bar(100 + i, 101 + i, 99 + i, 100 + i));
    const last = ind.calculate(data, cfg).series.at(-1)!;
    expect(last.value).toBeGreaterThan(0);
  });

  it('is negative in a downtrend', () => {
    const data: DataSeries = Array.from({ length: 40 }, (_, i) => bar(200 - i, 201 - i, 199 - i, 200 - i));
    const last = ind.calculate(data, cfg).series.at(-1)!;
    expect(last.value).toBeLessThan(0);
  });
});
