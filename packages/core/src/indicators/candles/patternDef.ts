import type { CandlePatternDirection, CandlePatternInfo, CandlePatternKind } from '@tradecanvas/commons';
import type { Candles, Trend } from './candleShape.js';

/** A pattern: what it is, the trend it needs before it, and its test on the bars ending at `i`. */
export interface PatternDef {
  info: CandlePatternInfo;
  /** The trend into its first bar it needs; none: any. */
  trend: Exclude<Trend, null> | null;
  test: (c: Candles, i: number) => boolean;
}

export function pattern(
  id: string,
  name: string,
  short: string,
  direction: CandlePatternDirection,
  kind: CandlePatternKind,
  bars: number,
  trend: Exclude<Trend, null> | null,
  test: (c: Candles, i: number) => boolean,
): PatternDef {
  return { info: Object.freeze({ id, name, short, direction, kind, bars }), trend, test };
}
