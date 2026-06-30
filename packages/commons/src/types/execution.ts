import type { ConnectionState } from './realtime.js';
import type {
  TradingOrder,
  OrderSide,
  OrderPlaceIntent,
  OrderModifyIntent,
  OrderCancelIntent,
  PositionModifyIntent,
  PositionCloseIntent,
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
}

export type ExecutionEventType =
  | 'orders'          // data: TradingOrder[]      — authoritative pending-order set
  | 'positions'       // data: TradingPosition[]   — authoritative open positions
  | 'fill'            // data: FillEvent           — an order filled
  | 'connectionChange'// data: ConnectionState
  | 'error';          // data: ExecutionError

export interface FillEvent {
  orderId: string;
  side: OrderSide;
  price: number;
  quantity: number;
  time: number;
}

export interface ExecutionError {
  message: string;
  cause?: unknown;
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

  on<T = unknown>(event: ExecutionEventType, listener: ExecutionListener<T>): void;
  off<T = unknown>(event: ExecutionEventType, listener: ExecutionListener<T>): void;

  dispose(): void;
}
