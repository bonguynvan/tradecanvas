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
  /** The distance the position's stop-loss trails the price by once the order fills (see `TradingPosition.trailingStop`). */
  trailingStop?: number;
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
  /**
   * The distance (in price) its stop-loss trails the best price by: the stop
   * follows the price up for a long and down for a short, and never moves
   * back. `stopLoss` is where the stop is now; its tag reads TSL. The account
   * moves it (the paper account does; a broker's adapter reports its own).
   */
  trailingStop?: number;
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
  /** The number locale `{pnl}` (and prices without a format) are grouped in. Unset: en-US. */
  locale?: string;
}

export interface DepthLevel {
  price: number;
  volume: number;
}

export interface DepthData {
  bids: DepthLevel[];
  asks: DepthLevel[];
}

/** How the depth overlay draws the order book (`Chart.setDepthOverlay`, `TradingConfig.depthOverlay`). */
export interface DepthOverlayConfig {
  /** Draw the overlay. Default `true` with `features.depth`, else `false`. */
  enabled?: boolean;
  /**
   * `'cumulative'` (the default) draws the size resting at a price and nearer
   * the market, so the bars grow away from it; `'level'` draws the size at each
   * price alone, so a wall shows as one long bar.
   */
  mode?: 'cumulative' | 'level';
  bidColor?: string;
  askColor?: string;
  /** The longest a bar can be, in pixels (never more than the plot is wide). Default 100. */
  maxWidth?: number;
  /**
   * The height of a bar in price, for a book whose levels are closer than the
   * chart can show or have gaps: the levels are added up into rows this far
   * apart, each row centred on a multiple of it and drawn from half a row below
   * to half a row above. Unset: one bar a level, as tall as the gap between the
   * two levels nearest the market. With a row size, `markBest` lines the
   * middle of the best rows.
   */
  rowSize?: number;
  /**
   * Where the rows start, in price, with `rowSize`: row k runs from
   * `rowOrigin + k · rowSize` up to the next one, and a level on a row's
   * start is in that row. A footprint whose cells start at multiples of its
   * row size, each tick centred on its price, lines up with `-tick / 2`.
   * A bid and an ask may then share the row by the market, as they share a
   * footprint's cell: the longer bar is drawn first, and `markBest` lines the
   * bid on the row's lower edge and the ask on its upper. `0` starts rows at
   * multiples of `rowSize`; without it each row is centred on one.
   */
  rowOrigin?: number;
  /** Draw a line at the best bid and at the best ask, as wide as the overlay. Default `false`. */
  markBest?: boolean;
  /** The colour of the best bid's line. Default green. */
  bestBidColor?: string;
  /** The colour of the best ask's line. Default red. */
  bestAskColor?: string;
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
   * The words on a position's tag after its open quantity, in place of its
   * side and its open profit. A template with the tokens {side} {qty}
   * {closedQty} {openQty} {entry} {price} {pnl} {pnlPct} {pnlSign}, or a
   * function for full control. Unset: the side ("Long", "Short") and the
   * profit in the profit or loss colour.
   */
  positionLabel?: string | ((ctx: PositionLabelContext) => string);
  depthOverlay?: DepthOverlayConfig;
  contextMenu?: { enabled?: boolean };
  /**
   * Buttons on the lines: × on an order cancels it, × on a position closes it
   * and ⇅ reverses it, × on a stop-loss or take-profit removes it, the
   * trail button on a stop-loss starts or ends its trailing (`trailStop`), and
   * SL and TP on a position's tag add the stop-loss or take-profit it has not
   * got (`addStops`). All on by default.
   */
  lineButtons?: { cancel?: boolean; close?: boolean; reverse?: boolean; removeStops?: boolean; trailStop?: boolean; addStops?: boolean };
  /** Marks where orders filled (from the execution adapter's fills). On by default. */
  fillMarks?: boolean;
  /** Decimals of the prices on the trading tags; unset, the price axis's (the market's or the range's). */
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
  /** The distance, in price, the position's stop-loss is to trail the price by. */
  trailingStop?: number;
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
  /**
   * The distance (in price) the stop-loss is to trail the price by; null ends
   * the trail and leaves the stop where it is, left out keeps it.
   */
  trailingStop?: number | null;
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
  lineButtons: { cancel: true, close: true, reverse: true, removeStops: true, trailStop: true, addStops: true },
  fillMarks: true,
  dragThreshold: 3,
};
