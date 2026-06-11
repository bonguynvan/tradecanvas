import { describe, it, expect } from 'vitest';
import type { DataSeries, IndicatorConfig } from '@tradecanvas/commons';
import { PercentagePriceOscillatorIndicator } from '../panel/PercentagePriceOscillator.js';
import { AcceleratorOscillatorIndicator } from '../panel/AcceleratorOscillator.js';
import { RelativeMomentumIndexIndicator } from '../panel/RelativeMomentumIndex.js';

function bar(open: number, high: number, low: number, close: number, volume = 100): DataSeries[number] {
  return { time: 0, open, high, low, close, volume };
}
function close(c: number): DataSeries[number] {
  return bar(c, c + 1, c - 1, c);
}

describe('PercentagePriceOscillator', () => {
  const ind = new PercentagePriceOscillatorIndicator();
  const cfg = { id: 'ppo', instanceId: 'p-1', params: { fast: 12, slow: 26, signal: 9 }, visible: true } as IndicatorConfig;

  it('is null until the slow EMA warms up', () => {
    const data: DataSeries = Array.from({ length: 20 }, (_, i) => close(100 + i));
    expect(ind.calculate(data, cfg).series.every((v) => v === null)).toBe(true);
  });

  it('is positive in a sustained uptrend (fast above slow)', () => {
    const data: DataSeries = Array.from({ length: 80 }, (_, i) => close(100 + i));
    const last = ind.calculate(data, cfg).series.at(-1)!;
    expect(last.value).toBeGreaterThan(0);
  });

  it('is negative in a sustained downtrend', () => {
    const data: DataSeries = Array.from({ length: 80 }, (_, i) => close(200 - i));
    const last = ind.calculate(data, cfg).series.at(-1)!;
    expect(last.value).toBeLessThan(0);
  });

  it('reports histogram = value − signal once signal exists', () => {
    const data: DataSeries = Array.from({ length: 80 }, (_, i) => close(100 + Math.sin(i / 5) * 10));
    const last = ind.calculate(data, cfg).series.at(-1)!;
    expect(last.hist).toBeCloseTo(last.value! - last.signal!, 6);
  });
});

describe('AcceleratorOscillator', () => {
  const ind = new AcceleratorOscillatorIndicator();

  it('is null until 34-bar SMA + smoothing warms up', () => {
    const data: DataSeries = Array.from({ length: 30 }, (_, i) => close(100 + i));
    expect(ind.calculate(data).series.every((v) => v === null)).toBe(true);
  });

  it('emits a finite value once warmed up', () => {
    const data: DataSeries = Array.from({ length: 80 }, (_, i) => close(100 + Math.sin(i / 7) * 15));
    const s = ind.calculate(data).series.filter((v) => v && v.value !== undefined);
    expect(s.length).toBeGreaterThan(0);
    expect(Number.isFinite(s.at(-1)!.value!)).toBe(true);
  });

  it('swings both positive and negative over oscillating data', () => {
    const data: DataSeries = Array.from({ length: 200 }, (_, i) => close(100 + Math.sin(i / 9) * 20));
    const vals = ind.calculate(data).series.filter((v) => v && v.value !== undefined).map((v) => v!.value!);
    expect(Math.max(...vals)).toBeGreaterThan(0);
    expect(Math.min(...vals)).toBeLessThan(0);
  });
});

describe('RelativeMomentumIndex', () => {
  const ind = new RelativeMomentumIndexIndicator();
  const cfg = { id: 'rmi', instanceId: 'r-1', params: { period: 20, momentum: 5 }, visible: true } as IndicatorConfig;

  it('is null until period + momentum warms up', () => {
    const data: DataSeries = Array.from({ length: 20 }, (_, i) => close(100 + i));
    expect(ind.calculate(data, cfg).series.every((v) => v === null)).toBe(true);
  });

  it('saturates near 100 in a pure uptrend', () => {
    const data: DataSeries = Array.from({ length: 60 }, (_, i) => close(100 + i));
    const last = ind.calculate(data, cfg).series.at(-1)!;
    expect(last.value).toBeGreaterThan(70);
  });

  it('saturates near 0 in a pure downtrend', () => {
    const data: DataSeries = Array.from({ length: 60 }, (_, i) => close(200 - i));
    const last = ind.calculate(data, cfg).series.at(-1)!;
    expect(last.value).toBeLessThan(30);
  });

  it('stays within 0–100', () => {
    const data: DataSeries = Array.from({ length: 150 }, (_, i) => close(100 + Math.sin(i / 6) * 12));
    const vals = ind.calculate(data, cfg).series.filter((v) => v && v.value !== undefined).map((v) => v!.value!);
    for (const v of vals) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});
