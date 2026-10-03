import { describe, it, expect } from 'vitest';
import type { DataSeries, IndicatorConfig, IndicatorValue } from '@tradecanvas/commons';
import { StochasticMomentumIndexIndicator } from '../panel/StochasticMomentumIndex.js';
import { RelativeVolatilityIndexIndicator } from '../panel/RelativeVolatilityIndex.js';
import { TrendStrengthIndexIndicator } from '../panel/TrendStrengthIndex.js';
import { LinearRegressionSlopeIndicator } from '../panel/LinearRegressionSlope.js';
import { StandardErrorIndicator } from '../panel/StandardError.js';
import { AverageDayRangeIndicator } from '../panel/AverageDayRange.js';
import { NetVolumeIndicator } from '../panel/NetVolume.js';
import { StandardErrorBandsIndicator } from '../overlay/StandardErrorBands.js';
import { GuppyMMAIndicator } from '../overlay/GuppyMMA.js';
import { MARibbonIndicator } from '../overlay/MARibbon.js';

const cfg = (id: string, params: Record<string, number> = {}) => ({ id, instanceId: `${id}-1`, params, visible: true }) as IndicatorConfig;

/** Bars from closes: each bar a point either side, the volume given or 100. */
const series = (closes: number[], volumes: number[] = []): DataSeries =>
  closes.map((c, i) => ({ time: i * 60_000, open: c, high: c + 1, low: c - 1, close: c, volume: volumes[i] ?? 100 }));
const up = (n: number, step = 1) => series(Array.from({ length: n }, (_, i) => 100 + i * step));
const down = (n: number, step = 1) => series(Array.from({ length: n }, (_, i) => 500 - i * step));
const wavy = (n: number) => series(Array.from({ length: n }, (_, i) => 100 + i * 0.5 + Math.sin(i) * 3));
const last = (points: (IndicatorValue | null)[]) => points.at(-1)!;

describe('Stochastic Momentum Index', () => {
  const ind = new StochasticMomentumIndexIndicator();
  it('is above zero closing near the top of the range, below it near the bottom, within ±100', () => {
    const rising = ind.calculate(up(80), cfg('smi')).series;
    const falling = ind.calculate(down(80), cfg('smi')).series;
    expect(last(rising).smi).toBeGreaterThan(0);
    expect(last(falling).smi).toBeLessThan(0);
    for (const v of [...rising, ...falling]) if (v) expect(Math.abs(v.smi as number)).toBeLessThanOrEqual(100);
    expect(last(rising).signal).toBeDefined();
  });
});

describe('Relative Volatility Index', () => {
  const ind = new RelativeVolatilityIndexIndicator();
  it('leans up when the volatility comes on up closes, down on down closes', () => {
    expect(last(ind.calculate(wavy(120), cfg('rvix')).series).value).toBeGreaterThan(50);
    expect(last(ind.calculate(series(Array.from({ length: 120 }, (_, i) => 300 - i * 0.5 + Math.sin(i) * 3)), cfg('rvix')).series).value).toBeLessThan(50);
  });
});

describe('Trend Strength Index', () => {
  const ind = new TrendStrengthIndexIndicator();
  it('is the correlation of the closes with time: 1 straight up, −1 straight down', () => {
    expect(last(ind.calculate(up(40), cfg('trendstrength')).series).value).toBeCloseTo(1, 6);
    expect(last(ind.calculate(down(40), cfg('trendstrength')).series).value).toBeCloseTo(-1, 6);
    expect(ind.calculate(up(10), cfg('trendstrength', { period: 14 })).series.every((v) => v === null)).toBe(true);
  });
});

describe('Linear Regression Slope and Standard Error', () => {
  it('slope: the line’s rise per bar', () => {
    expect(last(new LinearRegressionSlopeIndicator().calculate(up(30, 2), cfg('lrslope')).series).value).toBeCloseTo(2, 9);
  });
  it('standard error: none on a straight line, some with noise', () => {
    const ind = new StandardErrorIndicator();
    expect(last(ind.calculate(up(30), cfg('stderror')).series).value).toBeCloseTo(0, 9);
    expect(last(ind.calculate(wavy(30), cfg('stderror')).series).value).toBeGreaterThan(0);
  });
});

describe('Standard Error Bands', () => {
  const ind = new StandardErrorBandsIndicator();
  it('close on a straight line, apart with noise', () => {
    const line = last(ind.calculate(up(60), cfg('seb')).series);
    expect(line.upper).toBeCloseTo(line.middle as number, 9);
    const noisy = last(ind.calculate(wavy(60), cfg('seb')).series);
    expect(noisy.upper as number).toBeGreaterThan(noisy.middle as number);
    expect(noisy.middle as number).toBeGreaterThan(noisy.lower as number);
  });
});

describe('Guppy Multiple Moving Average', () => {
  it('twelve EMAs, the short ones nearer the price in a trend', () => {
    const v = last(new GuppyMMAIndicator().calculate(up(120), cfg('gmma')).series);
    const keys = ['s3', 's5', 's8', 's10', 's12', 's15', 'l30', 'l35', 'l40', 'l45', 'l50', 'l60'];
    for (const k of keys) expect(v[k], k).toBeDefined();
    expect(v.s3 as number).toBeGreaterThan(v.l60 as number);
  });
});

describe('Moving Average Ribbon', () => {
  it('four moving averages, simple or exponential', () => {
    const flat = series(Array.from({ length: 250 }, () => 42));
    const sma = last(new MARibbonIndicator().calculate(flat, cfg('maribbon')).series);
    expect([sma.ma1, sma.ma2, sma.ma3, sma.ma4]).toEqual([42, 42, 42, 42]);
    // A step from 100 to 200: an EMA moves toward it faster than an SMA.
    const step = series(Array.from({ length: 250 }, (_, i) => (i < 200 ? 100 : 200)));
    const ema = last(new MARibbonIndicator().calculate(step, cfg('maribbon', { exponential: 1 })).series);
    const sma200 = last(new MARibbonIndicator().calculate(step, cfg('maribbon')).series);
    expect(sma200.ma4).toBeCloseTo(125, 9);
    expect(ema.ma4 as number).toBeGreaterThan(130);
  });
});

describe('Average Day Range and Net Volume', () => {
  it('ADR: the average of the bars’ ranges', () => {
    expect(last(new AverageDayRangeIndicator().calculate(up(30), cfg('adr')).series).value).toBeCloseTo(2, 9);
  });
  it('net volume: the volume, signed by the close’s move', () => {
    const out = new NetVolumeIndicator().calculate(series([10, 11, 11, 9], [5, 6, 7, 8]), cfg('netvolume')).series;
    expect(out.map((v) => v?.value ?? null)).toEqual([null, 6, 0, -8]);
    expect(out[3]!.up).toBe(0);
  });
});
