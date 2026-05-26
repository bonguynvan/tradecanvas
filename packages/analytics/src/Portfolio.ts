import type {
  ClosedTrade,
  EquityPoint,
  Fill,
  PortfolioPosition,
  Side,
} from './types.js';

export interface PortfolioOptions {
  initialCash: number;
}

/**
 * Tracks cash, a single net position, realized PnL, and the equity curve.
 *
 * Simplifying assumptions:
 *  - One symbol at a time. Opposing fills net against the existing position.
 *  - Realized PnL is computed when a fill reduces or flips the position.
 *  - Equity = cash + position market value (mark-to-market).
 */
export class Portfolio {
  private cash: number;
  private readonly initialCash: number;
  private position: PortfolioPosition | null = null;
  private readonly fills: Fill[] = [];
  private readonly trades: ClosedTrade[] = [];
  private readonly equityCurve: EquityPoint[] = [];
  private realizedPnl = 0;

  constructor(opts: PortfolioOptions) {
    if (opts.initialCash <= 0) throw new Error('initialCash must be > 0');
    this.cash = opts.initialCash;
    this.initialCash = opts.initialCash;
  }

  getCash(): number {
    return this.cash;
  }

  getPosition(): Readonly<PortfolioPosition> | null {
    return this.position;
  }

  getFills(): ReadonlyArray<Fill> {
    return this.fills;
  }

  getTrades(): ReadonlyArray<ClosedTrade> {
    return this.trades;
  }

  getEquityCurve(): ReadonlyArray<EquityPoint> {
    return this.equityCurve;
  }

  getInitialCash(): number {
    return this.initialCash;
  }

  getRealizedPnl(): number {
    return this.realizedPnl;
  }

  unrealizedPnl(price: number): number {
    if (!this.position) return 0;
    const dir = this.position.side === 'long' ? 1 : -1;
    return (price - this.position.averagePrice) * this.position.quantity * dir;
  }

  equity(price: number): number {
    return this.cash + this.positionValue(price);
  }

  positionValue(price: number): number {
    if (!this.position) return 0;
    const dir = this.position.side === 'long' ? 1 : -1;
    return this.position.quantity * price * dir;
  }

  /** Apply a fill: cash flow + position update + realized PnL. */
  applyFill(fill: Fill): void {
    this.fills.push(fill);

    const signed = fill.side === 'long' ? fill.quantity : -fill.quantity;
    this.cash -= signed * fill.price;
    this.cash -= fill.commission;

    if (!this.position) {
      this.position = {
        side: fill.side,
        quantity: fill.quantity,
        averagePrice: fill.price,
        openedAt: fill.time,
        tag: fill.tag,
      };
      return;
    }

    if (this.position.side === fill.side) {
      // Same direction: average up
      const totalQty = this.position.quantity + fill.quantity;
      this.position = {
        ...this.position,
        quantity: totalQty,
        averagePrice:
          (this.position.averagePrice * this.position.quantity +
            fill.price * fill.quantity) /
          totalQty,
      };
      return;
    }

    // Opposite direction: close or flip
    const closing = Math.min(this.position.quantity, fill.quantity);
    const dir = this.position.side === 'long' ? 1 : -1;
    const pnl = (fill.price - this.position.averagePrice) * closing * dir;

    this.realizedPnl += pnl;
    this.trades.push({
      entryTime: this.position.openedAt,
      exitTime: fill.time,
      side: this.position.side,
      quantity: closing,
      entryPrice: this.position.averagePrice,
      exitPrice: fill.price,
      pnl,
      pnlPct: (fill.price / this.position.averagePrice - 1) * dir,
      commission: fill.commission,
      tag: fill.tag ?? this.position.tag,
    });

    const remaining = this.position.quantity - fill.quantity;
    if (remaining > 0) {
      this.position = { ...this.position, quantity: remaining };
    } else if (remaining < 0) {
      this.position = {
        side: fill.side,
        quantity: -remaining,
        averagePrice: fill.price,
        openedAt: fill.time,
        tag: fill.tag,
      };
    } else {
      this.position = null;
    }
  }

  /** Snapshot equity at the current bar close. */
  mark(time: number, price: number): void {
    const positionValue = this.positionValue(price);
    const unrealizedPnl = this.unrealizedPnl(price);
    this.equityCurve.push({
      time,
      equity: this.cash + positionValue,
      cash: this.cash,
      positionValue,
      unrealizedPnl,
      realizedPnl: this.realizedPnl,
    });
  }

  reverseSide(side: Side): Side {
    return side === 'long' ? 'short' : 'long';
  }
}
