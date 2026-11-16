/**
 * `@tradecanvas/core/patterns`: the candle patterns' detector and their list
 * on their own, for a page that finds patterns and draws no chart (a scanner,
 * a screener). It reaches none of the engine, so a bundler gives it a small
 * chunk of its own instead of the chart's; `@tradecanvas/core` exports the
 * same two.
 */
export { detectCandlePatterns, CANDLE_PATTERNS } from '../indicators/candles/detect.js';
export type { CandlePatternInfo, CandlePatternMatch, CandlePatternOptions } from '@tradecanvas/commons';
