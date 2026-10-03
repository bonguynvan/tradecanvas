export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit' | 'stop' | 'stopLimit';
export type OrderStatus = 'pending' | 'filled' | 'cancelled' | 'rejected';
export type OrderLabel = 'LIMIT' | 'STOP' | 'SL' | 'TP' | 'STOP LIMIT';

/** How long an order works: good till cancelled, or for the day. */
export type TimeInForce = 'gtc' | 'day';

export interface TradingOrder {
  id: string;
  side: OrderSide;
  type: OrderType;
  price: number;
  stopPrice?: number;
  quantity: number;
  label?: OrderLabel;
  draggable?: boolean;
  /** Stop-loss and take-profit the position gets when the order fills. */
  stopLoss?: number;
  takeProfit?: number;
  timeInForce?: TimeInForce;
  meta?: Record<string, unknown>;
}

export interface TradingPosition {
  id: string;
  side: OrderSide;
  entryPrice: number;
  quantity: number;
  /** Quantity already closed (for partial-close visualization). 0 ≤ closedQuantity ≤ quantity. */
  closedQuantity?: number;
  stopLoss?: number;
  takeProfit?: number;
  meta?: Record<string, unknown>;
}

/** Threshold-based P&L color stop. Sorted ascending by `pnl` is recommended. */
export interface PnLThreshold {
  /** Inclusive lower bound. Use -Infinity for the bottom-most stop. */
  pnl: number;
  color: string;
}

/** Tokens passed to position label templates. */
export interface PositionLabelContext {
  side: OrderSide;
  quantity: number;
  closedQuantity: number;
  openQuantity: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPct: number;
  precision: number;
  /** The chart's price format, for `{entry}` and `{price}` (decimals at `precision` without one). */
  formatPrice?: (price: number) => string;
}

export interface DepthLevel {
  price: number;
  volume: number;
}

export interface DepthData {
  bids: DepthLevel[];
  asks: DepthLevel[];
}

export interface TradingConfig {
  enabled: boolean;
  orderColors?: { buy?: string; sell?: string };
  positionColors?: { profit?: string; loss?: string; entry?: string };
  /**
   * Optional gradient of colors keyed to P&L value. When provided, the rendered
   * position zone uses the color of the highest threshold whose `pnl` ≤ live P&L.
   * Falls back to `positionColors.profit`/`.loss` when unset.
   */
  pnlThresholds?: PnLThreshold[];
  /**
   * Position P&L label template. Supports tokens: {side} {qty} {closedQty}
   * {openQty} {entry} {price} {pnl} {pnlPct} {pnlSign}. Pass a function for
   * full control. Default: `{side} {qty} | P&L: {pnlSign}{pnl}`.
   */
  positionLabel?: string | ((ctx: PositionLabelContext) => string);
  depthOverlay?: {
    enabled?: boolean;
    bidColor?: string;
    askColor?: string;
    maxWidth?: number;
  };
  contextMenu?: { enabled?: boolean };
  /**
   * Buttons on the lines: × on an order cancels it, × on a position closes it
   * and ⇅ reverses it, × on a stop-loss or take-profit removes it. All on by
   * default.
   */
  lineButtons?: { cancel?: boolean; close?: boolean; reverse?: boolean; removeStops?: boolean };
  /** Marks where orders filled (from the execution adapter's fills). On by default. */
  fillMarks?: boolean;
  pricePrecision?: number;
  dragThreshold?: number;
}

export interface OrderPlaceIntent {
  side: OrderSide;
  type: OrderType;
  price: number;
  stopPrice?: number;
  quantity?: number;
  /** Stop-loss and take-profit for the position the order opens. */
  stopLoss?: number;
  takeProfit?: number;
  timeInForce?: TimeInForce;
}

export interface OrderModifyIntent {
  orderId: string;
  newPrice: number;
  /** The price before the change, when known (e.g. from a drag). Optional so
   *  the chart's `orderModify` event payload routes straight to an adapter. */
  previousPrice?: number;
}

export interface OrderCancelIntent {
  orderId: string;
}

export interface PositionModifyIntent {
  positionId: string;
  /** A new stop-loss; null removes it, left out keeps it. */
  stopLoss?: number | null;
  /** A new take-profit; null removes it, left out keeps it. */
  takeProfit?: number | null;
}

export interface PositionCloseIntent {
  positionId: string;
}

/** Close a position and open the same size the other way. */
export interface PositionReverseIntent {
  positionId: string;
}

export const DEFAULT_TRADING_CONFIG: TradingConfig = {
  enabled: true,
  orderColors: { buy: '#1fa874', sell: '#e8505b' },
  positionColors: { profit: '#1fa874', loss: '#e8505b', entry: '#4c8dff' },
  depthOverlay: { enabled: false, bidColor: 'rgba(31, 168, 116,0.15)', askColor: 'rgba(232, 80, 91,0.15)', maxWidth: 100 },
  contextMenu: { enabled: true },
  lineButtons: { cancel: true, close: true, reverse: true, removeStops: true },
  fillMarks: true,
  pricePrecision: 2,
  dragThreshold: 3,
};
