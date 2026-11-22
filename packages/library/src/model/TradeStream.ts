import type { Trade } from '@tradecanvas/commons';

/**
 * A feed's trades told once each, in the order they were made: its recent
 * ones, then its live ones. Live trades that come before the recent ones
 * are in are held and told after them, those made later only: the recent
 * ones already hold the others. Asked for again (a reconnect), the recent
 * trades tell only what was not told.
 */
export class TradeStream {
  /** Live trades held until the recent ones are in; null once they are. */
  private waiting: Trade[] | null = [];
  private until: number;

  /** `until`: the time of the latest trade already told, for a stream that carries on from another. */
  constructor(until = -Infinity) {
    this.until = until;
  }

  /** When the latest trade told was made; -Infinity before the first. */
  toldUntil(): number {
    return this.until;
  }

  /** The feed's recent trades: those not told yet, oldest first, and after them the live ones held. */
  recent(trades: readonly Trade[]): Trade[] {
    const inOrder = trades.filter((t) => Number.isFinite(t.time)).sort((a, b) => a.time - b.time);
    return [...this.take(inOrder), ...this.release()];
  }

  /** The feed has no recent trades to give: the live ones held are told. */
  noRecent(): Trade[] {
    return this.release();
  }

  /** Live trades, as they come: told at once, or held (none told) until the recent ones are in. */
  live(trades: readonly Trade[]): Trade[] {
    const timed = trades.filter((t) => Number.isFinite(t.time));
    if (this.waiting) {
      this.waiting.push(...timed);
      return [];
    }
    for (const trade of timed) this.until = Math.max(this.until, trade.time);
    return timed;
  }

  private release(): Trade[] {
    const held = this.waiting;
    if (!held) return [];
    this.waiting = null;
    return this.take(held);
  }

  /** Those of `trades` made after the latest told, which they then are. */
  private take(trades: readonly Trade[]): Trade[] {
    const from = this.until;
    const fresh = trades.filter((t) => t.time > from);
    for (const trade of fresh) this.until = Math.max(this.until, trade.time);
    return fresh;
  }
}
