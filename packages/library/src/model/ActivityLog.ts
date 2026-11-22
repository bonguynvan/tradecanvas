import type { ExecutionErrorPayload, FillEvent, FillReason, OrderSide, OrderType, TradingOrder } from '@tradecanvas/commons';

/** What happened: an order placed, moved, cancelled or filled, or something the broker (or the chart) refused. */
export type ActivityKind = 'placed' | 'moved' | 'cancelled' | 'filled' | 'rejected';

/** One line of the trading activity log. */
export interface ActivityEntry {
  /** When it happened (ms since the epoch). */
  time: number;
  kind: ActivityKind;
  orderId?: string;
  side?: OrderSide;
  /** The order's type, for an order placed, moved or cancelled. */
  type?: OrderType;
  quantity?: number;
  /** The order's price, or the price a fill was at. */
  price?: number;
  /** Why a fill happened: an order, a close, a stop-loss… */
  reason?: FillReason;
  /** What a fill realised, when it closed a position. */
  pnl?: number;
  /** Why something was refused. */
  message?: string;
}

/** The entries kept when not told how many. */
const DEFAULT_LIMIT = 200;
/** How near an order's size its fills may add up and be the whole of it: a sum's rounding. */
const PART_SLACK = 1e-9;
/** How many of the latest entries a fill looks back through for its order's "cancelled", to take it back. */
const LOOK_BACK = 8;

const orderEntry = (kind: ActivityKind, order: TradingOrder, time: number): ActivityEntry => ({
  time, kind, orderId: order.id, side: order.side, type: order.type, quantity: order.quantity, price: order.price,
});

/**
 * What happened to the orders, told from what the chart is told: each new
 * set of working orders (an order that appears was placed, one whose price
 * changed was moved, one that left without a fill was cancelled), each fill,
 * and each error. It keeps the newest entries. No DOM: the chart feeds it and
 * the account panel reads it.
 */
export class ActivityLog {
  private list: ActivityEntry[] = [];
  /** The orders working when last told; null until the first set, which is what was there and no news. */
  private known: Map<string, TradingOrder> | null = null;
  /** How much of each working order the fills told of have filled: one filled whole leaves without a cancellation. */
  private readonly filled = new Map<string, number>();

  constructor(private readonly limit = DEFAULT_LIMIT) {}

  /** The working orders now, at `time`. */
  orders(next: readonly TradingOrder[], time: number): void {
    // Copies: an app may change its own order and give it again.
    const now = new Map(next.map((order) => [order.id, { ...order }]));
    const before = this.known;
    this.known = now;
    if (!before) return;
    for (const order of next) {
      const was = before.get(order.id);
      if (!was) this.add(orderEntry('placed', order, time));
      else if (was.price !== order.price) this.add(orderEntry('moved', order, time));
    }
    for (const [id, order] of before) {
      if (now.has(id)) continue;
      // Filled whole: that was logged. Filled in part, or not at all: what was left was cancelled.
      const done = this.filled.get(id) ?? 0;
      const whole = done >= order.quantity * (1 - PART_SLACK);
      this.filled.delete(id);
      // What was cancelled is what was left of it, with no sum's rounding after it.
      if (!whole) this.add(orderEntry('cancelled', done > 0 ? { ...order, quantity: Number((order.quantity - done).toPrecision(12)) } : order, time));
    }
  }

  /**
   * Start over from the next set of orders: it is what is there, and no news.
   * For when the orders are another broker's, or another symbol's.
   */
  rebase(): void {
    this.known = null;
    this.filled.clear();
  }

  /** An order filled, or a position closed. */
  fill(fill: FillEvent): void {
    // Told of its leaving first, it was called cancelled: it was not.
    const from = Math.max(0, this.list.length - LOOK_BACK);
    const at = this.list.findIndex((entry, i) => i >= from && entry.kind === 'cancelled' && entry.orderId === fill.orderId);
    if (at >= 0) this.list.splice(at, 1);
    else if (this.known?.has(fill.orderId)) this.filled.set(fill.orderId, (this.filled.get(fill.orderId) ?? 0) + fill.quantity);
    const entry: ActivityEntry = { time: fill.time, kind: 'filled', orderId: fill.orderId, side: fill.side, quantity: fill.quantity, price: fill.price };
    if (fill.reason !== undefined) entry.reason = fill.reason;
    if (fill.pnl !== undefined) entry.pnl = fill.pnl;
    this.add(entry);
    // The rest of it went with the fill (immediate-or-cancel): it was never working, so no set of orders tells of it.
    if (fill.dropped !== undefined && fill.dropped > 0) {
      this.add({ time: fill.time, kind: 'cancelled', orderId: fill.orderId, side: fill.side, quantity: fill.dropped });
    }
  }

  /** Something was refused, by the broker or by the chart before it got there. */
  error(error: Pick<ExecutionErrorPayload, 'message' | 'cause'>, time: number): void {
    this.add({ time, kind: 'rejected', message: reasonOf(error) });
  }

  /** The entries, oldest first: copies. */
  entries(): ActivityEntry[] {
    return this.list.map((entry) => ({ ...entry }));
  }

  /** Empty the log. The orders working stay known, so they are not logged as placed again. */
  clear(): void {
    this.list = [];
  }

  private add(entry: ActivityEntry): void {
    this.list.push(entry);
    if (this.list.length > this.limit) this.list.splice(0, this.list.length - this.limit);
  }
}

/** Why, in the broker's own words when it gave them: the cause's message, else the error's with the cause after it. */
function reasonOf(error: Pick<ExecutionErrorPayload, 'message' | 'cause'>): string {
  const { cause } = error;
  if (cause instanceof Error && cause.message) return cause.message;
  if (typeof cause === 'string' && cause) return `${error.message}: ${cause}`;
  return error.message;
}
