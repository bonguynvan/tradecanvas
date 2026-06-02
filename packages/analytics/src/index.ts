// @tradecanvas/analytics — strategy backtesting, portfolio tracking, risk metrics
export { Backtester } from './Backtester.js';
export { Portfolio } from './Portfolio.js';
export { computeRiskMetrics } from './RiskMetrics.js';
export type { RiskMetricsOptions } from './RiskMetrics.js';
export { runMonteCarlo } from './MonteCarlo.js';
export type {
  MonteCarloOptions,
  MonteCarloEquityBand,
  MonteCarloResult,
} from './MonteCarlo.js';
export {
  FixedCommission,
  PercentCommission,
  PerShareCommission,
  ZERO_COMMISSION,
} from './commission.js';
export {
  NO_SLIPPAGE,
  PercentSlippage,
  RangeBasedSlippage,
} from './slippage.js';
export * from './types.js';
export * from './strategies/index.js';
