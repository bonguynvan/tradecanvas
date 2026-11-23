import type { FillEvent, TradingOrder, TradingPosition } from '@tradecanvas/commons';
import { sameSymbol } from '@tradecanvas/commons';

/** How many of the latest fills are kept; the profit they realised is kept of all of them. */
const FILLS_KEPT = 1000;

/** What an account holds may name the symbol it is of. */
interface OfSymbol {
  symbol?: string;
}

/**
 * Those of `symbol`, and those that name none: what a chart showing `symbol` draws. All of them
 * while it shows none (bars set by hand, and no symbol said for them). A symbol is the same under
 * either of its names (`sameSymbol`): one an adapter calls BTCUSDT is drawn on BINANCE:BTCUSDT.
 */
export function ofSymbol<T extends OfSymbol>(items: readonly T[], symbol: string): T[] {
  return items.filter((item) => symbol === '' || item.symbol === undefined || sameSymbol(item.symbol, symbol));
}

/**
 * The orders, positions and fills a chart is told of: all the account holds, of every symbol. A
 * chart shows one symbol at a time and an account trades many: what names another symbol is kept,
 * and is not drawn there (a long of BTC was drawn on ETHUSDT, its profit worked out from ETH's
 * price).
 *
 * An order or a position is of the symbol it names, and is never given one it does not name: one
 * that names none is drawn on whatever the chart shows, as it always was (a guess at its symbol
 * could keep a position off the chart of its own). A fill is a mark on one symbol's bars: one
 * that names none is of its position's symbol or its order's, else of the one shown as it came.
 */
export class TradingBook {
  private orders: TradingOrder[] = [];
  private positions: TradingPosition[] = [];
  private fills: FillEvent[] = [];
  private realised = 0;

  /** The orders now, all of them, in place of those kept. */
  setOrders(orders: readonly TradingOrder[]): void {
    this.orders = [...orders];
  }

  /** The positions now, all of them, in place of those kept. */
  setPositions(positions: readonly TradingPosition[]): void {
    this.positions = [...positions];
  }

  /** A fill, as it is told on: with its symbol. `shown` is the symbol the chart shows as it comes, `''` with none. */
  addFill(fill: FillEvent, shown: string): FillEvent {
    const told = this.named(fill, shown);
    this.fills = [...this.fills.slice(-(FILLS_KEPT - 1)), told];
    this.realised += fill.pnl ?? 0;
    return told;
  }

  /** The fills there are, in place of those kept: the profit realised starts again from them. */
  setFills(fills: readonly FillEvent[], shown: string): void {
    this.fills = fills.slice(-FILLS_KEPT).map((fill) => this.named(fill, shown));
    this.realised = fills.reduce((sum, fill) => sum + (fill.pnl ?? 0), 0);
  }

  getOrders(): TradingOrder[] {
    return [...this.orders];
  }

  getPositions(): TradingPosition[] {
    return [...this.positions];
  }

  /** The latest fills, oldest first. */
  getFills(): FillEvent[] {
    return [...this.fills];
  }

  /** The profit and loss the fills realised, all of them, of every symbol. */
  realisedPnl(): number {
    return this.realised;
  }

  /** A fill with its symbol: its own, else its position's, its order's, or the one shown. As it came, with none known. */
  private named(fill: FillEvent, shown: string): FillEvent {
    if (fill.symbol !== undefined) return fill;
    const symbol = this.positions.find((position) => position.id === fill.positionId)?.symbol
      ?? this.orders.find((order) => order.id === fill.orderId)?.symbol
      ?? shown;
    return symbol === '' ? fill : { ...fill, symbol };
  }
}
