import type { FootprintBar, Trade } from '@tradecanvas/commons';
import { barTimeUnit } from '@tradecanvas/commons';
import type { FootprintStore } from '@tradecanvas/core';

/** Trades of bars still to come are kept up to this many; the oldest go first. */
const LATER_LIMIT = 20_000;

/**
 * Which bar a trade is of: its time in milliseconds, `'later'` for a bar
 * that is still to come, null for none.
 */
export type BarOfTrade = (tradeTime: number) => number | 'later' | null;

/**
 * The bar of `bars` a trade made at `time` (ms) is of: the last that had
 * opened by then, while it lasts (`span` ms a bar; Infinity where a bar has
 * no set length, as on a tick chart). After the last bar's end it is of a
 * bar still to come (`'later'`), as it is with no bars yet; before the first
 * bar, or in a bar that is not there, of none.
 */
export function barOfTrade(bars: ArrayLike<{ time: number }>, time: number, span: number): number | 'later' | null {
  const n = bars.length;
  if (n === 0) return 'later';
  const unit = barTimeUnit(bars);
  const last = bars[n - 1].time * unit;
  if (time >= last) return time < last + span ? last : 'later';
  let lo = 0;
  let hi = n - 1;
  // The last bar whose time is at or before the trade's.
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (bars[mid].time * unit <= time) lo = mid;
    else hi = mid - 1;
  }
  const opened = bars[lo].time * unit;
  return opened <= time && time < opened + span ? opened : null;
}

/**
 * The row size of rows given by hand: the smallest step between two prices
 * of one bar. Null with no two prices to measure.
 */
export function rowSizeOf(bars: readonly FootprintBar[]): number | null {
  let smallest = Infinity;
  for (const bar of bars) {
    const prices = bar.levels.map((level) => level.price).filter((price) => Number.isFinite(price)).sort((a, b) => a - b);
    for (let i = 1; i < prices.length; i++) {
      const step = prices[i] - prices[i - 1];
      if (step > 0 && step < smallest) smallest = step;
    }
  }
  return Number.isFinite(smallest) ? Number(smallest.toPrecision(12)) : null;
}

/**
 * A feed's trades into the footprint: its recent trades once, then its live
 * ones. Live trades that come before the recent ones are in are held, and
 * counted after them if they were made later, so none is counted twice and
 * none is lost in between. A trade of a bar still to come is kept until the
 * bar is there (`settle`).
 */
export class FootprintFeed {
  /** Live trades held until the recent ones are in; null once they are. */
  private waiting: Trade[] | null = [];
  /** Trades of bars still to come, in the order they came. */
  private later: Trade[] = [];

  constructor(
    private readonly store: FootprintStore,
    private readonly barOf: BarOfTrade,
  ) {}

  /**
   * The feed's recent trades, of which `asked` were asked for. Those the
   * footprint already has are left out. When the feed had more than it gave
   * and they start after what the footprint has, the bar they begin in is
   * left out: its first trades are missing, and a footprint with part of a
   * bar's trades reads as one with all of them. True when a trade was
   * counted.
   */
  history(trades: readonly Trade[], asked: number): boolean {
    const have = this.store.latestTrade();
    const inOrder = trades.filter((t) => Number.isFinite(t.time)).sort((a, b) => a.time - b.time);
    const cut = inOrder.length >= asked && inOrder.length > 0 && inOrder[0].time > have ? this.barOf(inOrder[0].time) : null;
    let counted = false;
    for (const trade of inOrder) {
      if (trade.time <= have) continue;
      if (typeof cut === 'number' && this.barOf(trade.time) === cut) continue;
      counted = this.count(trade) || counted;
    }
    return this.release() || counted;
  }

  /** The feed has no recent trades to give: the live ones count from the first. */
  skipHistory(): boolean {
    return this.release();
  }

  /** Live trades, as they come. True when a trade was counted. */
  live(trades: readonly Trade[]): boolean {
    if (this.waiting) {
      this.waiting.push(...trades);
      return false;
    }
    let counted = this.settle();
    for (const trade of trades) counted = this.count(trade) || counted;
    return counted;
  }

  /** Count the trades kept for bars that are there now. True when one was. */
  settle(): boolean {
    if (this.later.length === 0) return false;
    const kept = this.later;
    this.later = [];
    let counted = false;
    for (const trade of kept) counted = this.count(trade) || counted;
    return counted;
  }

  /** The live trades held while the recent ones were on their way: those made after them. */
  private release(): boolean {
    const held = this.waiting;
    if (!held) return false;
    this.waiting = null;
    const have = this.store.latestTrade();
    let counted = false;
    for (const trade of held) {
      if (trade.time > have) counted = this.count(trade) || counted;
    }
    return counted;
  }

  private count(trade: Trade): boolean {
    const bar = this.barOf(trade.time);
    if (bar === null) return false;
    if (bar === 'later') {
      this.later.push(trade);
      if (this.later.length > LATER_LIMIT) this.later.splice(0, this.later.length - LATER_LIMIT);
      return false;
    }
    return this.store.add(bar, trade);
  }
}
