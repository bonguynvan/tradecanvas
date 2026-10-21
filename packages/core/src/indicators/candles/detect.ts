import type { CandlePatternInfo, CandlePatternMatch, CandlePatternOptions, DataSeries } from '@tradecanvas/commons';
import { Candles } from './candleShape.js';
import type { PatternDef } from './patternDef.js';
import { DOUBLE_PATTERNS, SINGLE_PATTERNS } from './singlePatterns.js';
import { LONG_PATTERNS, TRIPLE_PATTERNS } from './multiPatterns.js';

const ALL: readonly PatternDef[] = [...SINGLE_PATTERNS, ...DOUBLE_PATTERNS, ...TRIPLE_PATTERNS, ...LONG_PATTERNS];

/** Every pattern the detector knows, in the order it reports them. */
export const CANDLE_PATTERNS: readonly CandlePatternInfo[] = ALL.map((d) => d.info);

/** The default bars in the trend average and the average body and range. */
export const DEFAULT_TREND_PERIOD = 10;

function trendPeriodOf(options: CandlePatternOptions): number {
  const p = options.trendPeriod;
  return p !== undefined && Number.isFinite(p) ? Math.max(2, Math.floor(p)) : DEFAULT_TREND_PERIOD;
}

function definitionsFor(options: CandlePatternOptions): readonly PatternDef[] {
  if (!options.patterns) return ALL;
  const wanted = new Set(options.patterns);
  return ALL.filter((d) => wanted.has(d.info.id));
}

/** The patterns ending at bar `i`, read with `c`. */
export function patternsEndingAt(c: Candles, i: number, defs: readonly PatternDef[]): PatternDef[] {
  const found: PatternDef[] = [];
  for (const def of defs) {
    const s = i - def.info.bars + 1;
    if (s < 0) continue;
    if (def.trend && c.trendBefore(s) !== def.trend) continue;
    if (def.test(c, i)) found.push(def);
  }
  return found;
}

/**
 * The candlestick patterns in `data`: each one found, on the bar it ends on.
 * Reversal patterns count only after the trend they reverse: the close
 * before the pattern above (or below) both its `trendPeriod`-bar average and
 * the close that many bars back. Bodies are long or short against the usual
 * body of the bars before (their average body, at least a quarter of their
 * average range). A bar can end more
 * than one pattern.
 */
export function detectCandlePatterns(data: DataSeries, options: CandlePatternOptions = {}): CandlePatternMatch[] {
  const c = new Candles(data, trendPeriodOf(options));
  const defs = definitionsFor(options);
  const matches: CandlePatternMatch[] = [];
  const from = options.from !== undefined && Number.isFinite(options.from) ? Math.max(0, Math.floor(options.from)) : 0;
  for (let i = from; i < data.length; i++) {
    for (const def of patternsEndingAt(c, i, defs)) matches.push({ index: i, time: data[i].time, pattern: def.info });
  }
  return matches;
}

/** The pattern definitions behind `CANDLE_PATTERNS`, for the indicator. */
export function patternDefinitions(options: CandlePatternOptions = {}): readonly PatternDef[] {
  return definitionsFor(options);
}

