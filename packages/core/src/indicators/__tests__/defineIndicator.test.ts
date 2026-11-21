import { describe, it, expect } from 'vitest';
import type { DataSeries, IndicatorConfig } from '@tradecanvas/commons';
import { defineIndicator } from '../defineIndicator.js';
import { ta } from '../ta.js';
import { RSIIndicator } from '../panel/RSI.js';
import { MACDIndicator } from '../panel/MACD.js';
import { ATRIndicator } from '../panel/ATR.js';
import { BollingerBandsIndicator } from '../overlay/BollingerBands.js';
import { EMAIndicator } from '../overlay/EMA.js';
import { describeInputs } from '../inputs.js';

/** Bars that go up and down, with ranges that differ. */
const bars: DataSeries = Array.from({ length: 120 }, (_, i) => {
  const close = 100 + Math.sin(i / 5) * 8 + Math.cos(i / 11) * 3 + i * 0.05;
  const open = close - Math.sin(i / 3) * 1.5;
  return { time: i * 60_000, open, high: Math.max(open, close) + 1 + (i % 4) * 0.3, low: Math.min(open, close) - 1 - (i % 3) * 0.4, close, volume: 10 + (i % 7) };
});
const column = (key: 'open' | 'high' | 'low' | 'close') => bars.map((bar) => bar[key]);
const config = (params: IndicatorConfig['params'] = {}): IndicatorConfig => ({ id: 'x', instanceId: 'x1', params });
const line = (out: { series?: (Record<string, number | undefined> | null)[] }, key: string) => out.series!.map((point) => point?.[key]);
const near = (a: (number | undefined)[], b: (number | undefined)[]) => {
  expect(a.length).toBe(b.length);
  a.forEach((v, i) => (v === undefined || b[i] === undefined ? expect(v).toBe(b[i]) : expect(v).toBeCloseTo(b[i]!, 9)));
};

describe('ta: the sums of the built-in indicators', () => {
  it('gives the built-in RSI, EMA, MACD, ATR and Bollinger Bands', () => {
    near(ta.rsi(column('close'), 14), line(new RSIIndicator().calculate(bars, config({ period: 14 })), 'value'));
    near(ta.ema(column('close'), 20), line(new EMAIndicator().calculate(bars, config({ period: 20 })), 'value'));
    const macd = ta.macd(column('close'), 12, 26, 9);
    const builtIn = new MACDIndicator().calculate(bars, config({ fast: 12, slow: 26, signal: 9 }));
    near(macd.macd, line(builtIn, 'macd'));
    near(macd.signal, line(builtIn, 'signal'));
    near(macd.histogram, line(builtIn, 'histogram'));
    near(ta.atr({ high: column('high'), low: column('low'), close: column('close') }, 14), line(new ATRIndicator().calculate(bars, config({ period: 14 })), 'value'));
    const bands = ta.bollinger(column('close'), 20, 2);
    const builtInBands = new BollingerBandsIndicator().calculate(bars, config({ period: 20, stdDev: 2 }));
    near(bands.upper, line(builtInBands, 'upper'));
    near(bands.middle, line(builtInBands, 'middle'));
    near(bands.lower, line(builtInBands, 'lower'));
  });

  it('averages, and has no value until a period of them is in', () => {
    expect(ta.sma([1, 2, 3, 4], 2)).toEqual([undefined, 1.5, 2.5, 3.5]);
    expect(ta.wma([1, 2, 3], 2)).toEqual([undefined, 5 / 3, 8 / 3]);
    expect(ta.highest([1, 3, 2, 0], 2)).toEqual([undefined, 3, 3, 2]);
    expect(ta.lowest([1, 3, 2, 0], 2)).toEqual([undefined, 1, 2, 0]);
    expect(ta.stdev([2, 4, 4, 4], 2)).toEqual([undefined, 1, 0, 0]);
    expect(ta.change([1, 4, 2])).toEqual([undefined, 3, -2]);
    expect(ta.change([1, 4, 2], 2)).toEqual([undefined, undefined, 1]);
  });

  it('feeds one sum to the next, over the bars the first has no value for', () => {
    const smoothed = ta.sma(ta.sma([1, 2, 3, 4, 5], 2), 2);
    expect(smoothed).toEqual([undefined, undefined, 2, 3, 4]);
  });

  it('takes null and NaN for no value, and a period as the whole number of at least one it is nearest', () => {
    expect(ta.sma([1, null, Number.NaN, 4, 6], 2)).toEqual([undefined, undefined, undefined, undefined, 5]);
    expect(ta.sma([1, 2, 3], 0)).toEqual([1, 2, 3]);
    expect(ta.sma([1, 2, 3], 1.6)).toEqual([undefined, 1.5, 2.5]);
    expect(ta.sma([1, 2, 3], Number.NaN)).toEqual([1, 2, 3]);
  });

  it('marks the bars where one line crosses another, or a level', () => {
    const a = [1, 2, 3, 2, 1, 3];
    const b = [2, 2, 2, 2, 2, 2];
    expect(ta.crossover(a, b)).toEqual([false, false, true, false, false, true]);
    expect(ta.crossunder(a, b)).toEqual([false, false, false, false, true, false]);
    expect(ta.crossover(a, 2)).toEqual(ta.crossover(a, b));
    expect(ta.crossover([undefined, 3, 1, 3], [2, 2, 2, 2])).toEqual([false, false, false, true]);
  });

  it('gives no values for no bars', () => {
    expect(ta.ema([], 10)).toEqual([]);
    expect(ta.macd([], 12, 26, 9)).toEqual({ macd: [], signal: [], histogram: [] });
    expect(ta.atr({ high: [], low: [], close: [] })).toEqual([]);
  });
});

describe('defineIndicator', () => {
  const crossover = () => defineIndicator({
    id: 'emaCross',
    name: 'EMA Crossover',
    placement: 'overlay',
    inputs: {
      fast: { default: 9, kind: 'int', min: 1 },
      slow: { default: 21, kind: 'int', min: 2 },
    },
    plots: [
      { key: 'fast', title: 'Fast', color: 0 },
      { key: 'slow', title: 'Slow', color: 1 },
      { key: 'buy', title: 'Buy', color: 2, kind: 'markers', shape: 'arrowUp', position: 'belowBar' },
    ],
    calculate({ bars: b, inputs, ta: sums }) {
      const fast = sums.ema(b.close, inputs.fast);
      const slow = sums.ema(b.close, inputs.slow);
      return { fast, slow, buy: sums.crossover(fast, slow) };
    },
  });

  it('makes an indicator the chart can register: a descriptor with its defaults, inputs and plots', () => {
    const plugin = crossover();
    expect(plugin.descriptor).toEqual(expect.objectContaining({ id: 'emaCross', name: 'EMA Crossover', placement: 'overlay', defaultConfig: { fast: 9, slow: 21 } }));
    expect(plugin.descriptor.inputs).toEqual({ fast: { kind: 'int', min: 1 }, slow: { kind: 'int', min: 2 } });
    expect(plugin.descriptor.plots).toHaveLength(3);
    expect(describeInputs(plugin.descriptor).map((input) => [input.name, input.kind, input.min])).toEqual([['fast', 'int', 1], ['slow', 'int', 2]]);
    expect(typeof plugin.render).toBe('function');
  });

  it('computes its lines from the bars’ columns and the inputs set, by bar and by time', () => {
    const out = crossover().calculate(bars, config({ fast: 5, slow: 10 }));
    near(line(out, 'fast'), ta.ema(column('close'), 5));
    near(line(out, 'slow'), ta.ema(column('close'), 10));
    const crossings = ta.crossover(ta.ema(column('close'), 5), ta.ema(column('close'), 10));
    expect(crossings.filter(Boolean).length).toBeGreaterThan(1);
    expect(line(out, 'buy')).toEqual(crossings.map((marked) => (marked ? 1 : undefined)));
    const last = bars.length - 1;
    expect(out.values.get(bars[last].time)).toEqual(out.series![last]);
    expect(out.series![0]).toBeNull();
  });

  it('uses an input’s default when it is not set, or set to another type', () => {
    const plugin = crossover();
    const byDefault = line(plugin.calculate(bars, config()), 'fast');
    near(byDefault, ta.ema(column('close'), 9));
    near(line(plugin.calculate(bars, config({ fast: 'nine', slow: Number.NaN })), 'slow'), ta.ema(column('close'), 21));
  });

  it('finds its lines by itself when it declares no plots: a line each, in the order returned', () => {
    const plugin = defineIndicator({
      id: 'custom-ema',
      name: 'Custom EMA',
      inputs: { period: { default: 14 } },
      calculate: ({ bars: b, inputs, ta: sums }) => ({ ema: sums.ema(b.close, inputs.period), high: sums.highest(b.high, inputs.period) }),
    });
    expect(plugin.descriptor.placement).toBe('panel');
    expect(plugin.descriptor.plots).toEqual([{ key: 'ema', title: 'ema', color: 0 }, { key: 'high', title: 'high', color: 1 }]);
  });

  it('says to declare the plots when its lines cannot be found on no bars', () => {
    expect(() => defineIndicator({ id: 'needsBars', name: 'Needs bars', calculate: ({ bars: b }) => ({ value: [b.close[0].toFixed(1).length] }) })).toThrow(/Declare them in plots/);
  });

  it('refuses a definition with no id or no calculate', () => {
    expect(() => defineIndicator({ id: ' ', name: 'x', calculate: () => ({}) })).toThrow(/id/);
    expect(() => defineIndicator({ id: 'x', name: 'x' } as never)).toThrow(/calculate/);
  });

  it('passes on its look: a pane’s scale, levels, shading, a group and a short name', () => {
    const group = { id: 'mine', label: 'Mine' };
    const plugin = defineIndicator({
      id: 'band', name: 'Band', shortName: 'BND', category: group, scale: { min: 0, max: 100 }, levels: [30, 70],
      plots: [{ key: 'upper', title: 'Upper', color: 0 }, { key: 'lower', title: 'Lower', color: 0 }],
      fills: [{ between: ['upper', 'lower'], color: 0, opacity: 0.1 }],
      calculate: ({ bars: b }) => ({ upper: b.high, lower: b.low }),
    });
    expect(plugin.descriptor).toEqual(expect.objectContaining({ shortName: 'BND', category: group, scale: { min: 0, max: 100 }, levels: [30, 70], fills: [{ between: ['upper', 'lower'], color: 0, opacity: 0.1 }] }));
    expect(plugin.descriptor.inputs).toBeUndefined();
  });

  it('leaves a bar with no number in any line without a point, and takes a short line as one that ends early', () => {
    const plugin = defineIndicator({ id: 'gaps', name: 'Gaps', plots: [{ key: 'value', title: 'V', color: 0 }], calculate: () => ({ value: [1, null, Number.NaN, false, 5] }) });
    const out = plugin.calculate(bars.slice(0, 7), config());
    expect(out.series).toEqual([{ value: 1 }, null, null, null, { value: 5 }, null, null]);
    expect(out.values.size).toBe(2);
  });
});
