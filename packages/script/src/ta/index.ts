import { ema, hma, rma, sma, stdev, vwma, wma } from './averages.js';
import { barssince, cross, crossover, crossunder, pivothigh, pivotlow, valuewhen } from './events.js';
import { bb, change, macd, mom, roc, rsi } from './oscillators.js';
import { atr, highest, lowest, supertrend, tr } from './ranges.js';

export type { BandsValue, MacdValue } from './oscillators.js';
export type { SupertrendValue } from './ranges.js';
export type { BarPrices, Step } from './common.js';

/**
 * The sums a script is made of, each run a bar at a time. Make one in the
 * script's setup (`const fast = ta.ema(9)`), then give it a value on each
 * bar (`fast(bar.close)`): it keeps its own state, so two calls of
 * `ta.ema(9)` are two averages. Their values are the chart's own built-in
 * indicators' (`@tradecanvas/core`), a missing value (NaN) handled as there.
 */
export const ta = {
  sma,
  ema,
  rma,
  wma,
  vwma,
  hma,
  stdev,
  bb,
  rsi,
  macd,
  change,
  mom,
  roc,
  tr,
  atr,
  supertrend,
  highest,
  lowest,
  crossover,
  crossunder,
  cross,
  pivothigh,
  pivotlow,
  barssince,
  valuewhen,
};

export type ScriptTa = typeof ta;
