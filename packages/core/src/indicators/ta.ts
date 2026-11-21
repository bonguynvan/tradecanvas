import type { BuiltInIndicatorId, BuiltInIndicators, DataSeries, IndicatorPlugin, OHLCBar } from '@tradecanvas/commons';
import { isPriceSource } from '@tradecanvas/commons';
import { BUILT_IN_FACTORIES } from './builtInFactories.js';
import { emaOf, highestAt, lowestAt, rmaOf, smaOf, stdevOf, wmaOf, type Num } from './math.js';
import { priceSourceBars } from './sources.js';

/** A value a bar: a number, or none there (undefined or null; NaN counts as none). */
export type TaSeries = readonly (number | null | undefined)[];

/** Bars as columns: the closes, and the columns beside them an indicator reads (a column left out is the closes'; no time is a minute a bar, no volume is none). */
export interface TaBars {
  readonly close: readonly number[];
  readonly open?: readonly number[];
  readonly high?: readonly number[];
  readonly low?: readonly number[];
  readonly volume?: readonly number[];
  /** Each bar's time, ms since the epoch. */
  readonly time?: readonly number[];
}

/** What a built-in indicator runs on: the bars, or a value a bar it reads as its prices. */
export type TaInput = TaBars | TaSeries;

/** The time between bars that have none of their own: an indicator needs them in order, not on a clock. */
const BAR_MS = 60_000;

/** The built-in indicators by id, each made when it is first asked for and kept. */
let builtIns: Map<string, IndicatorPlugin> | null = null;

function builtIn(id: string): IndicatorPlugin {
  builtIns ??= new Map(BUILT_IN_FACTORIES.map((make) => make()).map((plugin) => [plugin.descriptor.id, plugin]));
  const plugin = builtIns.get(id);
  if (!plugin) throw new Error(`ta.indicator: there is no built-in indicator '${id}'`);
  return plugin;
}

const isSeries = (input: TaInput): input is TaSeries => Array.isArray(input);

/** The bars of columns, a column left out read as the closes. */
function barsOf(columns: TaBars): OHLCBar[] {
  const { close, open = close, high = close, low = close, volume, time } = columns;
  return close.map((c, i) => ({ time: time?.[i] ?? i * BAR_MS, open: open[i] ?? c, high: high[i] ?? c, low: low[i] ?? c, close: c, volume: volume?.[i] ?? 0 }));
}

/**
 * A built-in indicator's lines over `input`. A value a bar becomes bars of
 * that value from its first one on (a later gap repeats the last), as the
 * chart feeds an indicator another indicator's line, and the lines come back
 * on the input's own bars.
 */
function runBuiltIn(id: string, input: TaInput, params: Record<string, unknown>): Record<string, Num[]> {
  const plugin = builtIn(id);
  const length = isSeries(input) ? input.length : input.close.length;
  const set: Record<string, number | string | boolean> = {};
  for (const [name, value] of Object.entries({ ...plugin.descriptor.defaultConfig, ...params })) {
    if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') set[name] = value;
  }
  const lines: Record<string, Num[]> = {};
  const lineOf = (key: string) => (lines[key] ??= new Array<Num>(length).fill(undefined));
  for (const plot of plugin.descriptor.plots ?? []) lineOf(plot.key);

  let data: DataSeries;
  let start = 0;
  if (isSeries(input)) {
    const values = clean(input);
    start = values.findIndex((v) => v !== undefined);
    if (start < 0) return lines;
    let last = values[start]!;
    data = values.slice(start).map((v, i) => {
      if (v !== undefined) last = v;
      return { time: (start + i) * BAR_MS, open: last, high: last, low: last, close: last, volume: 0 };
    });
  } else {
    const bars = barsOf(input);
    const source = set.source;
    data = isPriceSource(source) && source !== 'close' ? priceSourceBars(bars, source) : bars;
  }
  const output = plugin.calculate(data, { id, instanceId: `ta:${id}`, params: set });
  (output.series ?? []).forEach((point, i) => {
    if (!point) return;
    for (const key in point) {
      const value = point[key];
      if (value !== undefined && Number.isFinite(value)) lineOf(key)[start + i] = value;
    }
  });
  return lines;
}

/** As the sums read it: undefined where there is no number. */
function clean(src: TaSeries): Num[] {
  return src.map((v) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined));
}

/** A whole period of at least one, as the built-in indicators take one: its whole part. */
function whole(period: number): number {
  return Number.isFinite(period) ? Math.max(1, Math.floor(period)) : 1;
}

const numberAt = (src: TaSeries | number, i: number): Num => {
  const v = typeof src === 'number' ? src : src[i];
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
};

/** Where `a` goes from one side of `b` to the other between a bar and the next; `up`: from at or under it to over it. */
function crossed(a: TaSeries, b: TaSeries | number, up: boolean): boolean[] {
  return a.map((_, i) => {
    const now = numberAt(a, i);
    const other = numberAt(b, i);
    const before = numberAt(a, i - 1);
    const otherBefore = numberAt(b, i - 1);
    if (i === 0 || now === undefined || other === undefined || before === undefined || otherBefore === undefined) return false;
    return up ? before <= otherBefore && now > other : before >= otherBefore && now < other;
  });
}

/**
 * The sums indicators are made of, each over a value a bar and returning a
 * value a bar (undefined where there is none yet), so one feeds the next:
 * `ta.ema(ta.rsi(bars.close, 14), 9)`. The averages are the ones the built-in
 * indicators are made of (an EMA starts as the simple average of its first
 * `period` values), and `rsi`, `macd`, `atr`, `bollinger` and
 * `ta.indicator(id, …)` run the built-in indicators themselves, so there is
 * one sum for each and the chart's values are these.
 */
export const ta = {
  /** Simple moving average. */
  sma: (src: TaSeries, period: number): Num[] => smaOf(clean(src), whole(period)),
  /** Exponential moving average, started as the simple average of its first `period` values. */
  ema: (src: TaSeries, period: number): Num[] => emaOf(clean(src), whole(period)),
  /** Linearly weighted moving average: the newest value weighs most. */
  wma: (src: TaSeries, period: number): Num[] => wmaOf(clean(src), whole(period)),
  /** Wilder's smoothing (RMA, SMMA). */
  rma: (src: TaSeries, period: number): Num[] => rmaOf(clean(src), whole(period)),
  /** Standard deviation (of the whole population) of the last `period` values. */
  stdev: (src: TaSeries, period: number): Num[] => stdevOf(clean(src), whole(period)),
  /** The highest of the last `period` values. */
  highest: (src: TaSeries, period: number): Num[] => {
    const values = clean(src);
    return values.map((_, i) => highestAt(values, i, whole(period)));
  },
  /** The lowest of the last `period` values. */
  lowest: (src: TaSeries, period: number): Num[] => {
    const values = clean(src);
    return values.map((_, i) => lowestAt(values, i, whole(period)));
  },
  /** How far each value is from the one `bars` before it. */
  change: (src: TaSeries, bars = 1): Num[] => {
    const back = whole(bars);
    return src.map((_, i) => {
      const now = numberAt(src, i);
      const before = numberAt(src, i - back);
      return now === undefined || before === undefined ? undefined : now - before;
    });
  },
  /**
   * A built-in indicator's lines over `input`, by key: `ta.indicator('stochastic', bars, { kPeriod: 14 }).k`.
   * It runs the indicator the chart draws, so the values are the chart's.
   * `input` is the bars (`bars`, or any of their columns with `close`), or a
   * value a bar, which the indicator then reads as its prices: open, high,
   * low and close all that value, from its first one on. `params` are the
   * indicator's own, each optional; a `source` of `'hl2'`, `'ohlc4'`… picks
   * that price of the bars. Not for the indicators that read another symbol.
   */
  indicator: <K extends BuiltInIndicatorId>(id: K, input: TaInput, params: BuiltInIndicators[K]['params'] = {}): Record<BuiltInIndicators[K]['lines'], Num[]> & Record<string, Num[]> =>
    runBuiltIn(id, input, params as Record<string, unknown>) as Record<BuiltInIndicators[K]['lines'], Num[]> & Record<string, Num[]>,
  /** Relative Strength Index, 0 to 100: the built-in RSI's. */
  rsi: (src: TaSeries, period = 14): Num[] => runBuiltIn('rsi', src, { period }).value,
  /** MACD, the built-in's: the fast average less the slow one, its signal line, and the one less the other. */
  macd: (src: TaSeries, fast = 12, slow = 26, signal = 9): { macd: Num[]; signal: Num[]; histogram: Num[] } => {
    const lines = runBuiltIn('macd', src, { fast, slow, signal });
    return { macd: lines.macd, signal: lines.signal, histogram: lines.histogram };
  },
  /** Average True Range, the built-in's: Wilder's smoothing of each bar's range stretched to the close before it. */
  atr: (bars: TaBars, period = 14): Num[] => runBuiltIn('atr', bars, { period }).value,
  /** Bollinger Bands, the built-in's: a simple average and the lines `mult` standard deviations either side of it. */
  bollinger: (src: TaSeries, period = 20, mult = 2): { upper: Num[]; middle: Num[]; lower: Num[] } => {
    const lines = runBuiltIn('bb', src, { period, stdDev: mult });
    return { upper: lines.upper, middle: lines.middle, lower: lines.lower };
  },
  /** True on the bars where `a` goes over `b` (a line, or a level): at or under it the bar before, over it now. */
  crossover: (a: TaSeries, b: TaSeries | number): boolean[] => crossed(a, b, true),
  /** True on the bars where `a` goes under `b` (a line, or a level): at or over it the bar before, under it now. */
  crossunder: (a: TaSeries, b: TaSeries | number): boolean[] => crossed(a, b, false),
};

/** The sums `defineIndicator` hands a `calculate`, and an app can use on its own. */
export type Ta = typeof ta;
