import type { ConnectionState } from './realtime.js';
import type {
  TradingOrder,
  OrderSide,
  OrderPlaceIntent,
  OrderModifyIntent,
  OrderCancelIntent,
  PositionModifyIntent,
  PositionCloseIntent,
  PositionReverseIntent,
} from './trading.js';

// --- Execution Adapter (Strategy Pattern, mirrors DataAdapter) ---
//
// FROZEN for 1.0. Turns the chart's display-only trading overlay into a real
// trading surface. The chart routes its emitted order/position *intents* into
// these methods; the adapter performs the round-trip (broker, paper engine,
// OMS, …) and emits authoritative `orders` / `positions` snapshots that the
// chart renders. The adapter is the single source of truth — the chart holds
// no trading state of its own.

export interface ExecutionConfig {
  /** Account identifier, when the broker scopes by account. */
  account?: string;
  /** Hint that this is a paper/sandbox session. */
  paper?: boolean;
  meta?: Record<string, unknown>;
  /**
   * What a confirmed bracket (`bracketPlace`) does. `'place'` (the default):
   * it goes to the adapter as one order (`placeOrder`): a limit or a stop
   * entry against the price, its quantity, its stop-loss and take-profit.
   * The chart then sends `bracketOrder` once the adapter took it, or
   * `executionError` (`command: 'bracketPlace'`). A bracket with no quantity
   * is not confirmed (no one saw a size to place) and stays to be given one,
   * and one with no price yet to tell a limit entry from a stop is not sent:
   * `executionError` says so (`reason`).
   * `'event'`: only the `bracketPlace` event, for your own code to place.
   */
  brackets?: 'event' | 'place';
}

export type ExecutionEventType =
  /** `data`: `TradingOrder[]`, every working order (the whole set). */
  | 'orders'
  /** `data`: `TradingPosition[]`, every open position (the whole set). */
  | 'positions'
  /** `data`: `FillEvent`, an order filled. */
  | 'fill'
  /** `data`: `AccountSummary`, the account's money, when the adapter keeps one. */
  | 'account'
  /** `data`: `MarginCall`, the account's equity fell under the part of its margin it is to keep. */
  | 'marginCall'
  /** `data`: `ConnectionState`. */
  | 'connectionChange'
  /** `data`: `ExecutionError`. */
  | 'error';

/** An account's money, as its broker counts it. */
export interface AccountSummary {
  /** The cash: what was paid in, with what closed trades made or lost and less what trading cost. */
  balance: number;
  /** The balance with the open positions' profit or loss at the price now. */
  equity: number;
  /** The open positions' profit or loss at the price now. */
  unrealisedPnl: number;
  /** What closed trades made or lost. */
  realisedPnl: number;
  /** What the open positions hold of the account. */
  marginUsed: number;
  /** What is left to open positions with: the equity less the margin used. */
  freeMargin: number;
  /** What trading has cost: the commissions paid. */
  commission: number;
  /**
   * The equity as a part of the margin used (the margin level): 1.5 is
   * 150%. Left out while no position holds margin, and by an adapter that
   * does not count it.
   */
  marginLevel?: number;
  /** The currency the figures are in ("USD"), when the adapter says. */
  currency?: string;
}

/** Why a fill happened: an order, a position closed by hand or reversed, or its stop-loss or take-profit. */
/**
 * Why a fill happened. `'liquidation'`: the account closed the position
 * itself, its equity having fallen under its stop-out level.
 */
export type FillReason = 'order' | 'close' | 'reverse' | 'stopLoss' | 'takeProfit' | 'liquidation';

/** An account warned: its equity has fallen under the part of the margin held it is to keep. */
export interface MarginCall {
  /** The equity as a part of the margin used, now: 0.9 is 90%. */
  marginLevel: number;
  /** The level it fell under. */
  level: number;
  equity: number;
  marginUsed: number;
}

export interface FillEvent {
  orderId: string;
  side: OrderSide;
  price: number;
  quantity: number;
  /** When it filled (ms since the epoch). */
  time: number;
  /** The position it opened or closed. */
  positionId?: string;
  reason?: FillReason;
  /** Profit or loss it realised, for a fill that closes a position. */
  pnl?: number;
  /** What the fill cost, when the account charges for trading. */
  commission?: number;
}

export interface ExecutionError {
  message: string;
  cause?: unknown;
  /** The chart's intent whose command failed (`'orderPlace'`, `'bracketPlace'`…), when it was one. */
  command?: string;
  /**
   * Why the chart sent it no further, when that was the chart's call and not
   * the adapter's: a bracket with no quantity (`'noQuantity'`), or no price yet
   * to tell a limit entry from a stop (`'noPrice'`).
   */
  reason?: 'noQuantity' | 'noPrice';
}

export interface ExecutionEvent<T = unknown> {
  type: ExecutionEventType;
  data: T;
  timestamp: number;
}

export type ExecutionListener<T = unknown> = (event: ExecutionEvent<T>) => void;

/**
 * Execution adapter interface. Reuses the existing `*Intent` types verbatim so
 * a chart that already emits `orderPlace` / `positionModify` events plugs in
 * with no new vocabulary.
 *
 * Orders and positions are assumed to belong to the chart's active symbol —
 * consistent with `chart.setOrders` / `chart.setPositions` today.
 *
 * Built-in: `PaperExecutionAdapter` (virtual fills, the safe sandbox).
 * Implement this for: broker REST/WS APIs, exchange order routing, a custom OMS.
 */
export interface ExecutionAdapter {
  readonly name: string;

  connect(config: ExecutionConfig): void | Promise<void>;
  disconnect(): void;
  getConnectionState(): ConnectionState;

  /** Submit a new order. Resolves with the created order (filled or pending). */
  placeOrder(intent: OrderPlaceIntent): Promise<TradingOrder>;
  /** Re-price a pending order. */
  modifyOrder(intent: OrderModifyIntent): Promise<void>;
  /** Cancel a pending order. */
  cancelOrder(intent: OrderCancelIntent): Promise<void>;
  /** Edit a position's stop-loss / take-profit. */
  modifyPosition(intent: PositionModifyIntent): Promise<void>;
  /** Close a position (full close). */
  closePosition(intent: PositionCloseIntent): Promise<void>;
  /**
   * Close a position and open the same size the other way. Optional: without
   * it, the chart closes the position and places a market order instead.
   */
  reversePosition?(intent: PositionReverseIntent): Promise<void>;
  /** The account's money now, when the adapter keeps one; it then also emits `account` as it changes. */
  getAccount?(): AccountSummary | null;
  /**
   * The market price, live or replayed, and its time (ms). Optional: a paper
   * adapter fills pending orders and stops against it and stamps fills with
   * the time. The chart calls it with the replayed price during a replay.
   */
  setMarkPrice?(price: number, time?: number): void;

  on<T = unknown>(event: ExecutionEventType, listener: ExecutionListener<T>): void;
  off<T = unknown>(event: ExecutionEventType, listener: ExecutionListener<T>): void;

  dispose(): void;
}
