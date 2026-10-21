/** Which way a candle pattern points. */
export type CandlePatternDirection = 'bullish' | 'bearish' | 'neutral';

/** What a candle pattern says: a turn, more of the same, or doubt. */
export type CandlePatternKind = 'reversal' | 'continuation' | 'indecision';

export interface CandlePatternInfo {
  /** `'bullishEngulfing'`, `'hammer'`… */
  id: string;
  name: string;
  /** A label short enough to print over a bar: `'Engulf'`, `'Hammer'`. */
  short: string;
  direction: CandlePatternDirection;
  kind: CandlePatternKind;
  /** How many bars it spans, its last bar the one it is found on. */
  bars: number;
}

export interface CandlePatternMatch {
  /** The index of the pattern's last bar. */
  index: number;
  /** That bar's time. */
  time: number;
  pattern: CandlePatternInfo;
}

export interface CandlePatternOptions {
  /** Only these pattern ids; default all. */
  patterns?: readonly string[];
  /** Bars in the average the trend before a pattern is read from, and in the average body and range. Default `10`. */
  trendPeriod?: number;
  /** Only patterns ending at or after this bar index. */
  from?: number;
}
