import type { OHLCBar } from '@tradecanvas/commons';

export type Side = 'long' | 'short';
export type OrderType = 'market' | 'limit' | 'stop';
export type OrderStatus = 'pending' | 'filled' | 'cancelled' | 'rejected';
export type TimeInForce = 'gtc' | 'day' | 'ioc';

export interface BacktestOrder {
  id: string;
  side: Side;
  type: OrderType;
  /** Positive quantity. Direction comes from `side`. */
  quantity: number;
  /** Required for limit / stop orders. */
  price?: number;
  /** Optional client tag, useful for grouping trades by strategy. */
  tag?: string;
  timeInForce?: TimeInForce;
}

export interface Fill {
  orderId: string;
  time: number;
  price: number;
  quantity: number;
  side: Side;
  commission: number;
  slippage: number;
  tag?: string;
}

export interface ClosedTrade {
  entryTime: number;
  exitTime: number;
  side: Side;
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  pnlPct: number;
  commission: number;
  tag?: string;
}

export interface PortfolioPosition {
  side: Side;
  quantity: number;
  averagePrice: number;
  openedAt: number;
  tag?: string;
}

export interface EquityPoint {
  time: number;
  equity: number;
  cash: number;
  positionValue: number;
  unrealizedPnl: number;
  realizedPnl: number;
}

export interface StrategyContext {
  bar: OHLCBar;
  index: number;
  history: ReadonlyArray<OHLCBar>;
  position: Readonly<PortfolioPosition> | null;
  cash: number;
  equity: number;
  /** Place an order to be filled on the next bar's open. */
  placeOrder: (order: Omit<BacktestOrder, 'id'> & { id?: string }) => string;
  /** Close current position with a market order. */
  close: (tag?: string) => string | null;
  /** Cancel a pending order. */
  cancel: (orderId: string) => boolean;
}

export type StrategyFn = (ctx: StrategyContext) => void;

export interface CommissionModel {
  /** Returns commission charged for a fill of `quantity` at `price`. */
  calculate(quantity: number, price: number): number;
}

export interface SlippageModel {
  /** Returns the actual fill price given an intended price and side. */
  apply(intendedPrice: number, side: Side, bar: OHLCBar): number;
}

export interface BacktestOptions {
  initialCash: number;
  commission?: CommissionModel;
  slippage?: SlippageModel;
  /** Allow shorting. Default true. */
  allowShort?: boolean;
}

export interface BacktestResult {
  fills: ReadonlyArray<Fill>;
  trades: ReadonlyArray<ClosedTrade>;
  equityCurve: ReadonlyArray<EquityPoint>;
  initialCash: number;
  finalEquity: number;
  metrics: RiskMetrics;
}

/**
 * Summary of a backtest. Every `...Pct` field, `cagr` and `winRate` are
 * fractions: 0.12 is 12%.
 */
export interface RiskMetrics {
  /** Final equity minus initialCash, in money. */
  totalReturn: number;
  /** Total return as a fraction of initialCash: 0.12 is +12%. */
  totalReturnPct: number;
  /** Compound annual growth rate as a fraction, or 0 when the curve spans no time. */
  cagr: number;
  sharpe: number;
  sortino: number;
  /** `cagr / maxDrawdownPct`, or 0 when there is no drawdown. */
  calmar: number;
  /**
   * The largest fall from a running peak of the equity curve, in money. The
   * peak starts at the curve's first point.
   */
  maxDrawdown: number;
  /**
   * The deepest fall from a running peak, as a fraction of that peak: 0.5 is
   * 50%. Measured apart from maxDrawdown, so on a growing account the two can
   * come from different falls.
   */
  maxDrawdownPct: number;
  winRate: number;
  profitFactor: number;
  expectancy: number;
  averageWin: number;
  averageLoss: number;
  trades: number;
}
