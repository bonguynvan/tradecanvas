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

export interface RiskMetrics {
  totalReturn: number;
  totalReturnPct: number;
  cagr: number;
  sharpe: number;
  sortino: number;
  calmar: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  winRate: number;
  profitFactor: number;
  expectancy: number;
  averageWin: number;
  averageLoss: number;
  trades: number;
}
