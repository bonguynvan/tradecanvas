export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit' | 'stop' | 'stopLimit';
export type OrderStatus = 'pending' | 'filled' | 'cancelled' | 'rejected';
export type OrderLabel = 'LIMIT' | 'STOP' | 'SL' | 'TP' | 'STOP LIMIT';

export interface TradingOrder {
  id: string;
  side: OrderSide;
  type: OrderType;
  price: number;
  stopPrice?: number;
  quantity: number;
  label?: OrderLabel;
  draggable?: boolean;
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
  pricePrecision?: number;
  dragThreshold?: number;
}

export interface OrderPlaceIntent {
  side: OrderSide;
  type: OrderType;
  price: number;
  stopPrice?: number;
  quantity?: number;
}

export interface OrderModifyIntent {
  orderId: string;
  newPrice: number;
  previousPrice: number;
}

export interface OrderCancelIntent {
  orderId: string;
}

export interface PositionModifyIntent {
  positionId: string;
  stopLoss?: number;
  takeProfit?: number;
}

export interface PositionCloseIntent {
  positionId: string;
}

export const DEFAULT_TRADING_CONFIG: TradingConfig = {
  enabled: true,
  orderColors: { buy: '#26A69A', sell: '#EF5350' },
  positionColors: { profit: '#26A69A', loss: '#EF5350', entry: '#2196F3' },
  depthOverlay: { enabled: false, bidColor: 'rgba(38,166,154,0.15)', askColor: 'rgba(239,83,80,0.15)', maxWidth: 100 },
  contextMenu: { enabled: true },
  pricePrecision: 2,
  dragThreshold: 3,
};
