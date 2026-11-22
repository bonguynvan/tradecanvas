import type { FootprintBar, TimeFrame, Trade } from '@tradecanvas/commons';
import { barTimeUnit, parseTimeframe, tickBarCount } from '@tradecanvas/commons';
import { autoFootprintRow, type FootprintStore } from '@tradecanvas/core';

/** Trades of bars still to come are kept up to this many; the oldest go first. */
const LATER_LIMIT = 20_000;
const DAY_MS = 86_400_000;
/** The units a bar has a set length in, ms: a month's days differ. */
const SPAN_MS: Partial<Record<string, number>> = { s: 1000, m: 60_000, h: 3_600_000, d: DAY_MS, w: 7 * DAY_MS };

/**
 * How long a bar lasts, ms, where it has a set length: its timeframe's, for
 * seconds to weeks; with no timeframe known, the distance of the last two
 * bars, for bars under a day (longer ones skip weekends). Bars of months, of
 * trades (`'100T'`) and a lone bar have none (Infinity): a trade after the
 * last bar is of it.
 */
export function barSpanOf(timeframe: TimeFrame | null, bars: ArrayLike<{ time: number }>): number {
  if (timeframe !== null) {
    if (tickBarCount(timeframe) !== null) return Infinity;
    const parsed = parseTimeframe(timeframe);
    const unit = parsed ? SPAN_MS[parsed.unit] : undefined;
    if (parsed && unit !== undefined) return parsed.count * unit;
    if (parsed) return Infinity;
  }
  if (bars.length < 2) return Infinity;
  const span = (bars[bars.length - 1].time - bars[bars.length - 2].time) * barTimeUnit(bars);
  return span > 0 && span < DAY_MS ? span : Infinity;
}

/**
 * The row size a footprint keeps: the one set; else the step of the rows
 * given by hand; else about a ten-thousandth of `price`, in whole steps of
 * the market's price step where it has one. 0 while none of them is known.
 */
export function footprintRowSize(
  set: number | 'auto',
  given: readonly FootprintBar[] | undefined,
  price: number,
  step: number | undefined,
): number {
  if (typeof set === 'number') return set;
  const fromRows = given ? rowSizeOf(given) : null;
  if (fromRows) return fromRows;
  const auto = autoFootprintRow(price);
  if (!(auto > 0)) return 0;
  const size = step !== undefined && step > 0 ? Math.max(1, Math.round(auto / step)) * step : auto;
  return Number(size.toPrecision(12));
}

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
  /** The bar the recent trades began part way through: no trade of it is counted, its live ones neither. */
  private cut: number | null = null;

  constructor(
    private readonly store: FootprintStore,
    private readonly barOf: BarOfTrade,
  ) {}

  /**
   * The feed's recent trades, of which `asked` were asked for. Those the
   * footprint already has are left out. When the feed had more than it gave
   * and they start after what the footprint has, the bar they begin in is
   * left out, its live trades too: its first trades are missing, and a
   * footprint with part of a bar's trades reads as one with all of them.
   * True when a trade was counted.
   */
  history(trades: readonly Trade[], asked: number): boolean {
    const have = this.store.latestTrade();
    const inOrder = trades.filter((t) => Number.isFinite(t.time)).sort((a, b) => a.time - b.time);
    const begins = inOrder.length >= asked && inOrder.length > 0 && inOrder[0].time > have ? this.barOf(inOrder[0].time) : null;
    if (typeof begins === 'number') {
      this.cut = begins;
      // What it had ends before these begin (a long break in the connection): the bar it had last is missing its end.
      const broken = Number.isFinite(have) ? this.barOf(have) : null;
      if (typeof broken === 'number') this.store.set({ time: broken, levels: [] });
    }
    let counted = false;
    for (const trade of inOrder) {
      if (trade.time > have) counted = this.count(trade) || counted;
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
    if (bar === null || bar === this.cut) return false;
    // Before the footprint has a row size (no price to work one out from yet), as before its bar is there: kept.
    if (bar === 'later' || this.store.getRowSize() <= 0) {
      this.later.push(trade);
      if (this.later.length > LATER_LIMIT) this.later.splice(0, this.later.length - LATER_LIMIT);
      return false;
    }
    return this.store.add(bar, trade);
  }
}
