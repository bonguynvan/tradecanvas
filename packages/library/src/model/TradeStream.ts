import type { Trade } from '@tradecanvas/commons';

/** How many of the trades told lately are kept: what a trade asked for again is known by, and what a late listener can read. */
export const TRADES_KEPT = 2000;
/** How many live trades are held while the recent ones are on their way; over it, the oldest held go. */
export const TRADES_HELD = 20_000;

/** What a feed's recent trades come to, once those already told are left out. */
export interface RecentTrades {
  /** Those of the recent trades not told before, oldest first. */
  fresh: Trade[];
  /** The live trades that were held while the recent ones were on their way, those not among them. */
  held: Trade[];
  /**
   * When the feed gave as many trades as were asked for and the oldest of
   * them was not told before: when that trade was made. The feed had more
   * than it gave, so the trades made just before it are missing. Null
   * otherwise.
   */
  begins: number | null;
  /** With `begins`: when the latest trade told before it was made, where the hole starts; null when none was. */
  before: number | null;
}

const isTrade = (t: Trade): boolean =>
  Number.isFinite(t.time) && Number.isFinite(t.price) && t.price > 0 && Number.isFinite(t.volume) && t.volume > 0;

/** What a trade is known by: a feed's trades carry no name of their own. */
const keyOf = (t: Trade): string => `${t.time}|${t.price}|${t.volume}|${t.side ?? ''}`;

/**
 * A feed's trades told once each: its recent ones, then its live ones.
 *
 * - Live trades that come while the recent ones are on their way are held,
 *   and told after them.
 * - A trade is known by what it is (its time, price, size and side), not by
 *   a mark in time: asked for again (a reconnect), the recent trades tell
 *   the ones missed though later ones were told first. Two trades alike are
 *   two; a third like them is told when the feed has three.
 * - The trades told lately are kept (`trades()`), those given by hand among
 *   them.
 */
export class TradeStream {
  /** Live trades held until the recent ones are in; null while none are awaited. */
  private waiting: Trade[] | null = [];
  /** The trades told, in the order told, from `head` on. */
  private told: Trade[] = [];
  private head = 0;
  /** How many of each trade kept were told. */
  private readonly seen = new Map<string, number>();
  private readonly keep: number;
  private readonly holdLimit: number;

  constructor(keep = TRADES_KEPT, holdLimit = TRADES_HELD) {
    this.keep = Math.max(1, Math.floor(keep));
    this.holdLimit = Math.max(1, Math.floor(holdLimit));
  }

  /** Wait for the recent trades (again): live ones are held until they are in, or said to be none. */
  hold(): void {
    this.waiting ??= [];
  }

  /**
   * The feed's recent trades, of which `asked` were asked for: those not
   * told before, and after them the live ones that were held.
   */
  recent(trades: readonly Trade[], asked: number): RecentTrades {
    const inOrder = (Array.isArray(trades) ? trades : []).filter(isTrade).sort((a, b) => a.time - b.time);
    const fresh = this.unseen(inOrder);
    const partial = inOrder.length > 0 && inOrder.length >= asked && fresh[0] === inOrder[0];
    const begins = partial ? inOrder[0].time : null;
    const before = begins === null ? null : this.latestBefore(begins);
    for (const trade of fresh) this.note(trade);
    return { fresh, held: this.release(), begins, before };
  }

  /** The feed has no recent trades to give: the live ones held are told. */
  noRecent(): Trade[] {
    return this.release();
  }

  /** Live trades, as they come: told at once, or held (none told) while the recent ones are awaited. */
  live(trades: readonly Trade[]): Trade[] {
    const made = trades.filter(isTrade);
    if (this.waiting) {
      for (const trade of made) this.waiting.push(trade);
      if (this.waiting.length > this.holdLimit) this.waiting = this.waiting.slice(this.waiting.length - this.holdLimit);
      return [];
    }
    for (const trade of made) this.note(trade);
    return made;
  }

  /** Trades given by hand: those that are trades, told as they are and kept with the others. */
  byHand(trades: readonly Trade[]): Trade[] {
    const made = trades.filter(isTrade);
    for (const trade of made) this.note(trade);
    return made;
  }

  /** The trades told lately, by the time they were made, oldest first. */
  trades(): Trade[] {
    return this.told.slice(this.head).sort((a, b) => a.time - b.time);
  }

  /** The live trades held while the recent ones were on their way: those not told among them. */
  private release(): Trade[] {
    const held = this.waiting;
    if (!held) return [];
    this.waiting = null;
    const fresh = this.unseen(held);
    for (const trade of fresh) this.note(trade);
    return fresh;
  }

  /** Those of a batch not told before: of trades alike, as many as the batch has over those told. */
  private unseen(batch: readonly Trade[]): Trade[] {
    const inBatch = new Map<string, number>();
    const fresh: Trade[] = [];
    for (const trade of batch) {
      const key = keyOf(trade);
      const count = (inBatch.get(key) ?? 0) + 1;
      inBatch.set(key, count);
      if (count > (this.seen.get(key) ?? 0)) fresh.push(trade);
    }
    return fresh;
  }

  /** When the latest trade told before `time` was made; null when none was. */
  private latestBefore(time: number): number | null {
    let latest: number | null = null;
    for (let i = this.head; i < this.told.length; i++) {
      const at = this.told[i].time;
      if (at < time && (latest === null || at > latest)) latest = at;
    }
    return latest;
  }

  /** A trade told: kept, the oldest told forgotten once there are more than are kept. */
  private note(trade: Trade): void {
    this.told.push(trade);
    const key = keyOf(trade);
    this.seen.set(key, (this.seen.get(key) ?? 0) + 1);
    if (this.told.length - this.head > this.keep) this.forget(this.told[this.head++]);
    // The forgotten ones are dropped from the list in one go, not one shift a trade.
    if (this.head > this.keep) {
      this.told = this.told.slice(this.head);
      this.head = 0;
    }
  }

  private forget(trade: Trade): void {
    const key = keyOf(trade);
    const left = (this.seen.get(key) ?? 0) - 1;
    if (left > 0) this.seen.set(key, left);
    else this.seen.delete(key);
  }
}
