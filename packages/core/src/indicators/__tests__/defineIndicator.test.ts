import { describe, it, expect, vi } from 'vitest';
import type { DataSeries, IndicatorConfig } from '@tradecanvas/commons';
import { defineIndicator } from '../defineIndicator.js';
import { ta } from '../ta.js';
import { RSIIndicator } from '../panel/RSI.js';
import { MACDIndicator } from '../panel/MACD.js';
import { ATRIndicator } from '../panel/ATR.js';
import { BollingerBandsIndicator } from '../overlay/BollingerBands.js';
import { EMAIndicator } from '../overlay/EMA.js';
import { describeInputs } from '../inputs.js';
import { BUILT_IN_FACTORIES } from '../builtInFactories.js';

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
    // As the built-in indicators take a period: its whole part.
    expect(ta.sma([1, 2, 3], 2.9)).toEqual([undefined, 1.5, 2.5]);
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

  it('counts MACD’s slow period from the source’s first value, as the built-in on another indicator’s line', () => {
    const closes = column('close');
    const late = [...new Array<undefined>(14).fill(undefined), ...closes.slice(14)];
    const { macd, signal } = ta.macd(late, 3, 6, 2);
    expect(macd.findIndex((v) => v !== undefined)).toBe(14 + 6 - 1);
    expect(signal.findIndex((v) => v !== undefined)).toBe(14 + 6 - 1);
    near(macd.slice(14), ta.macd(closes.slice(14), 3, 6, 2).macd);
  });

  it('has no values when the period is longer than the bars', () => {
    expect(ta.sma([1, 2, 3], 5)).toEqual([undefined, undefined, undefined]);
    expect(ta.rsi([1, 2, 3], 14)).toEqual([undefined, undefined, undefined]);
    expect(ta.macd([1, 2, 3]).macd).toEqual([undefined, undefined, undefined]);
  });

  it('gives no values for no bars', () => {
    expect(ta.ema([], 10)).toEqual([]);
    expect(ta.macd([], 12, 26, 9)).toEqual({ macd: [], signal: [], histogram: [] });
    expect(ta.atr({ high: [], low: [], close: [] })).toEqual([]);
  });
});

describe('ta.indicator: a built-in indicator’s lines', () => {
  const columns = { time: bars.map((bar) => bar.time), open: column('open'), high: column('high'), low: column('low'), close: column('close'), volume: bars.map((bar) => bar.volume ?? 0) };

  it('gives the lines of the indicator the chart draws, by key', () => {
    const stochastic = BUILT_IN_FACTORIES.map((make) => make()).find((plugin) => plugin.descriptor.id === 'stochastic')!;
    const builtIn = stochastic.calculate(bars, config({ ...stochastic.descriptor.defaultConfig as IndicatorConfig['params'] }));
    const lines: Record<string, (number | undefined)[]> = ta.indicator('stochastic', columns);
    const keys = stochastic.descriptor.plots!.map((plot) => plot.key);
    expect(keys.length).toBeGreaterThan(1);
    for (const key of keys) near(lines[key], line(builtIn, key));
    // The lines are typed by the id: a key the indicator has not is not one.
    // @ts-expect-error stochastic has k and d
    expect(ta.indicator('stochastic', columns).value).toBeUndefined();
  });

  it('takes the indicator’s own inputs, the rest at their defaults', () => {
    near(ta.indicator('rsi', columns, { period: 7 }).value, line(new RSIIndicator().calculate(bars, config({ period: 7 })), 'value'));
    near(ta.indicator('ema', columns).value, ta.ema(column('close'), 20));
  });

  it('reads a price of the bars other than the close when its source says so', () => {
    const hl2 = bars.map((bar) => (bar.high + bar.low) / 2);
    near(ta.indicator('sma', columns, { period: 5, source: 'hl2' }).value, ta.sma(hl2, 5));
  });

  it('runs on a value a bar, from its first one on, and gives the lines back on the same bars', () => {
    const rsi = ta.rsi(column('close'), 14);
    const smoothed = ta.indicator('ema', rsi, { period: 5 }).value;
    expect(smoothed).toHaveLength(bars.length);
    near(smoothed, ta.ema(rsi, 5));
    expect(smoothed.findIndex((v) => v !== undefined)).toBe(14 + 5 - 1);
  });

  it('has every line of the indicator, with no values, when the input has none', () => {
    expect(ta.indicator('macd', [undefined, undefined])).toEqual({ histogram: [undefined, undefined], macd: [undefined, undefined], signal: [undefined, undefined] });
    expect(ta.indicator('rsi', []).value).toEqual([]);
  });

  it('reads columns left out as the closes, and bars with no time in order', () => {
    near(ta.indicator('atr', { close: column('close'), high: column('high'), low: column('low') }, { period: 14 }).value, line(new ATRIndicator().calculate(bars, config({ period: 14 })), 'value'));
    expect(ta.indicator('sma', { close: [1, 2, 3] }, { period: 2 }).value).toEqual([undefined, 1.5, 2.5]);
  });

  it('says so when there is no such indicator', () => {
    expect(() => ta.indicator('nope' as never, columns)).toThrow(/no built-in indicator 'nope'/);
  });

  const run = (id: string, input: Parameters<typeof ta.indicator>[1], params: object = {}) =>
    ta.indicator(id as never, input, params as never) as Record<string, (number | undefined)[]>;

  it('can run every built-in on bars and on a value a bar, of any length, each line as long as its input', () => {
    const closes = column('close');
    for (const plugin of BUILT_IN_FACTORIES.map((make) => make())) {
      const id = plugin.descriptor.id;
      for (const length of [0, 1, 2, 3, 120]) {
        for (const input of [closes.slice(0, length), { close: closes.slice(0, length) }, { ...columns, close: closes.slice(0, length) }]) {
          const lines = run(id, input);
          for (const key of Object.keys(lines)) expect(lines[key], `${id}.${key} on ${length}`).toHaveLength(length);
        }
      }
    }
  });

  it('gives the same lines when asked again after other inputs: an indicator is kept, its sums are not', () => {
    for (const plugin of BUILT_IN_FACTORIES.map((make) => make())) {
      const id = plugin.descriptor.id;
      const first = run(id, columns);
      run(id, column('close').slice(0, 40).reverse());
      run(id, { close: column('open') });
      expect(run(id, columns), id).toEqual(first);
    }
  });

  it('leaves a bar the input has no value for without one, as the other sums do', () => {
    const gapped = column('close').map((v, i) => (i >= 40 && i < 45 ? undefined : v));
    for (const [id, key] of [['rsi', 'value'], ['bb', 'middle'], ['macd', 'macd'], ['ema', 'value']] as const) {
      const lineOf = run(id, gapped, { period: 5, fast: 3, slow: 6, signal: 2 })[key];
      expect(lineOf.slice(40, 45), id).toEqual([undefined, undefined, undefined, undefined, undefined]);
      expect(lineOf[39], id).toBeTypeOf('number');
      expect(lineOf[45], id).toBeTypeOf('number');
    }
    expect(ta.rsi(gapped, 5).slice(40, 45)).toEqual([undefined, undefined, undefined, undefined, undefined]);
  });

  it('reads a bar whose close is no number as the close before it, so one bad bar does not end the line', () => {
    const close = column('close').slice(0, 40);
    close[10] = Number.NaN;
    const atr = ta.atr({ close, high: column('high').slice(0, 40), low: column('low').slice(0, 40) }, 5);
    expect(atr[9]).toBeTypeOf('number');
    expect(atr[39]).toBeTypeOf('number');
    expect(atr.slice(5).every((v) => v !== undefined && Number.isFinite(v))).toBe(true);
  });

  it('reads a source by the name the indicator gives it, and takes one that is no price of the bars as the close', () => {
    near(run('sma', columns, { period: 5, source: 'ind:other:value' }).value, ta.sma(column('close'), 5));
    near(run('sma', column('close'), { period: 5, source: 'hl2' }).value, ta.sma(column('close'), 5));
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

  it('says to declare the plots when a run on no bars returns no lines: it would draw nothing', () => {
    expect(() => defineIndicator({ id: 'guarded', name: 'Guarded', calculate: ({ bars: b }) => (b.length < 5 ? {} : { value: b.close }) })).toThrow(/Declare them in plots/);
  });

  it('hands calculate its inputs as the settings dialog bounds them: whole, within min and max, of the choices', () => {
    const seen: unknown[] = [];
    const plugin = defineIndicator({
      id: 'bounded', name: 'Bounded',
      inputs: {
        period: { default: 14, kind: 'int', min: 2, max: 50 },
        factor: { default: 1.5, min: 0.5 },
        mode: { default: 'ema', options: ['ema', { value: 'sma', label: 'Simple' }] },
        on: { default: true },
      },
      plots: [{ key: 'value', title: 'V', color: 0 }],
      calculate: ({ inputs }) => { seen.push({ ...inputs }); return { value: [] }; },
    });
    plugin.calculate(bars, config({ period: 14.9, factor: 0.1, mode: 'sma', on: false }));
    plugin.calculate(bars, config({ period: -3, factor: 2.25, mode: 'wma', on: 'yes' }));
    plugin.calculate(bars, config({ period: '20', factor: 'x' }));
    plugin.calculate(bars, config({ period: 900 }));
    expect(seen).toEqual([
      { period: 14, factor: 0.5, mode: 'sma', on: false },
      { period: 2, factor: 2.25, mode: 'ema', on: true },
      { period: 20, factor: 1.5, mode: 'ema', on: true },
      { period: 50, factor: 1.5, mode: 'ema', on: true },
    ]);
  });

  it('reads the source the user picked as the closes', () => {
    const plugin = defineIndicator({ id: 'src', name: 'Src', inputs: { source: { default: 'close', source: true } }, plots: [{ key: 'value', title: 'V', color: 0 }], calculate: ({ bars: b }) => ({ value: b.close }) });
    expect(plugin.descriptor.inputs).toEqual({ source: { source: true } });
    expect(plugin.descriptor.defaultConfig).toEqual({ source: 'close' });
  });

  it('puts a mark given as true at the bar’s close when its plot marks a value on the prices', () => {
    const plugin = defineIndicator({
      id: 'atClose', name: 'At close', placement: 'overlay',
      plots: [{ key: 'hit', title: 'Hit', color: 0, kind: 'markers' }],
      calculate: ({ bars: b }) => ({ hit: b.close.map((_, i) => i % 10 === 0) }),
    });
    const out = plugin.calculate(bars, config());
    expect(out.series![10]).toEqual({ hit: bars[10].close });
    expect(out.series![11]).toBeNull();
  });

  it('leaves out marks given as true in a pane of its own, where there is no price to put them at, and says so once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const plugin = defineIndicator({
      id: 'inPane', name: 'In pane',
      plots: [{ key: 'value', title: 'V', color: 0 }, { key: 'hit', title: 'Hit', color: 1, kind: 'markers' }],
      calculate: ({ bars: b }) => ({ value: b.close, hit: b.close.map(() => true) }),
    });
    const out = plugin.calculate(bars, config());
    plugin.calculate(bars, config());
    expect(out.series![3]).toEqual({ value: bars[3].close });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('inPane');
    warn.mockRestore();
  });

  it('keeps its own copy of the plots it is given', () => {
    const plots = [{ key: 'value', title: 'V', color: 0 }];
    const plugin = defineIndicator({ id: 'copy', name: 'Copy', plots, calculate: ({ bars: b }) => ({ value: b.close }) });
    plots.push({ key: 'other', title: 'O', color: 1 });
    expect(plugin.descriptor.plots).toHaveLength(1);
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
