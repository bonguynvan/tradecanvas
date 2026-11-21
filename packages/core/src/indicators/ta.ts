import { emaOf, highestAt, lowestAt, rmaOf, smaOf, stdevOf, wmaOf, type Num } from './math.js';

/** A value a bar: a number, or none there (undefined or null; NaN counts as none). */
export type TaSeries = readonly (number | null | undefined)[];

/** The columns `ta.atr` reads. */
export interface TaBars {
  readonly high: readonly number[];
  readonly low: readonly number[];
  readonly close: readonly number[];
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

/** An exponential average that starts at its first value, and stays where it is over a bar with none. */
function fromFirst(src: TaSeries, period: number): Num[] {
  const alpha = 2 / (period + 1);
  let value: number | undefined;
  return src.map((_, i) => {
    const v = numberAt(src, i);
    if (v === undefined) return undefined;
    value = value === undefined ? v : value + alpha * (v - value);
    return value;
  });
}

/**
 * The sums indicators are made of, each over a value a bar and returning a
 * value a bar (undefined where there is none yet), so one feeds the next:
 * `ta.ema(ta.rsi(bars.close, 14), 9)`. They are the sums the built-in
 * indicators use: an EMA starts as the simple average of its first `period`
 * values, RSI and ATR smooth as Wilder did.
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
  /** Relative Strength Index, 0 to 100. */
  rsi: (src: TaSeries, period = 14): Num[] => {
    const moves = ta.change(src);
    const gains = rmaOf(moves.map((m) => (m === undefined ? undefined : Math.max(m, 0))), whole(period));
    const losses = rmaOf(moves.map((m) => (m === undefined ? undefined : Math.max(-m, 0))), whole(period));
    return gains.map((gain, i) => {
      const loss = losses[i];
      if (gain === undefined || loss === undefined) return undefined;
      return loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
    });
  },
  /**
   * MACD: the fast average less the slow one, its signal line, and the one
   * less the other. As the built-in MACD, its averages start at the source's
   * first value (not at a simple average), and it has values from the
   * source's `slow`-th.
   */
  macd: (src: TaSeries, fast = 12, slow = 26, signal = 9): { macd: Num[]; signal: Num[]; histogram: Num[] } => {
    const quick = fromFirst(src, whole(fast));
    const long = fromFirst(src, whole(slow));
    let seen = 0;
    const macd = quick.map((q, i) => {
      if (q === undefined || long[i] === undefined) return undefined;
      seen++;
      return seen < whole(slow) ? undefined : q - long[i]!;
    });
    const line = fromFirst(macd, whole(signal));
    return { macd, signal: line, histogram: macd.map((m, i) => (m === undefined || line[i] === undefined ? undefined : m - line[i]!)) };
  },
  /** Average True Range: Wilder's smoothing of each bar's range stretched to the close before it. */
  atr: (bars: TaBars, period = 14): Num[] => {
    const ranges = bars.high.map((high, i) => {
      const low = bars.low[i];
      if (i === 0) return high - low;
      const prev = bars.close[i - 1];
      return Math.max(high - low, Math.abs(high - prev), Math.abs(low - prev));
    });
    return rmaOf(clean(ranges), whole(period));
  },
  /** Bollinger Bands: a simple average and the lines `mult` standard deviations either side of it. */
  bollinger: (src: TaSeries, period = 20, mult = 2): { upper: Num[]; middle: Num[]; lower: Num[] } => {
    const middle = ta.sma(src, period);
    const spread = ta.stdev(src, period);
    const side = (sign: 1 | -1) => middle.map((m, i) => (m === undefined || spread[i] === undefined ? undefined : m + sign * mult * spread[i]!));
    return { upper: side(1), middle, lower: side(-1) };
  },
  /** True on the bars where `a` goes over `b` (a line, or a level): at or under it the bar before, over it now. */
  crossover: (a: TaSeries, b: TaSeries | number): boolean[] => crossed(a, b, true),
  /** True on the bars where `a` goes under `b` (a line, or a level): at or over it the bar before, under it now. */
  crossunder: (a: TaSeries, b: TaSeries | number): boolean[] => crossed(a, b, false),
};

/** The sums `defineIndicator` hands a `calculate`, and an app can use on its own. */
export type Ta = typeof ta;
