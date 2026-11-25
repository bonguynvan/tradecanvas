import type { Trade } from '@tradecanvas/commons';

/** How many rows the tape shows unless told otherwise. */
export const TAPE_ROWS = 200;
/** The most rows it shows, whatever it is told: each is an element on the page. */
export const TAPE_ROWS_MOST = 1000;
/** How many trades it keeps behind the rows: a lower least size finds them again. */
export const TAPE_KEPT = 2000;
/** A trade this many times the usual size is a large one. */
const LARGE_TIMES = 10;
/** The usual size is the mean of the trades kept, once there are this many to tell it by. */
const USUAL_FROM = 10;
/** The most decimals a size is written to. */
const MOST_SIZE_DECIMALS = 4;
/** Nearer a rounded size than this, a size is that size: 0.1 + 0.2 is 0.3. */
const SIZE_NOISE = 1e-9;

/**
 * The decimals a size needs to be written in full, four at the most: none
 * for 100, two for 0.25. A tape writes every size to the decimals the
 * finest of them needs, so its column lines up.
 */
export function sizeDecimals(size: number): number {
  if (!Number.isFinite(size)) return 0;
  for (let decimals = 0; decimals < MOST_SIZE_DECIMALS; decimals++) {
    if (Math.abs(size - Number(size.toFixed(decimals))) < SIZE_NOISE) return decimals;
  }
  return MOST_SIZE_DECIMALS;
}

/** Which trades a tape lists: all of them, or those one side took. */
export type TapeSide = 'all' | 'buy' | 'sell';

/** A sum of sizes without the hair floating point leaves on it: a tenth and two tenths are three tenths. */
const tidy = (size: number): number => Number(size.toPrecision(12));

/** Whether two trades are one to a reader: made at the same moment, at the same price, by the same side. */
const together = (a: TapeRow, b: TapeRow): boolean => a.time === b.time && a.price === b.price && a.side === b.side;

/** One trade as the tape lists it; grouped, the trades made together as one. */
export interface TapeRow {
  /** When it was made, ms. */
  time: number;
  price: number;
  volume: number;
  /** Who took it; null where neither the feed nor the trade before it says. */
  side: 'buy' | 'sell' | null;
  /** Several times the usual size of the trades before it. */
  large: boolean;
}

/**
 * The trades of a tape (time and sales): the newest `capacity` of at least
 * the least size, newest first, by the time they were made. A trade that
 * does not say who took it is told by the trade before it: bought when the
 * price went up to it, sold when it went down, as the last when it stayed.
 * More trades are kept than shown (`keep`), so lowering the least size
 * brings the smaller ones back.
 *
 * It can list one side's trades alone (`setSide`), and make one row of the
 * trades made together (`setGroup`): a market order that took several
 * resting orders at a price reads as the one trade it was, measured against
 * the least size by what it adds up to, and large when what it adds up to
 * is, or when one of its trades was marked so. Every trade is kept as it
 * came, so either choice can be changed back.
 */
export class TapeModel {
  /** Every trade kept, by the time it was made, oldest first. */
  private trades: TapeRow[] = [];
  private minSize = 0;
  private side: TapeSide = 'all';
  private grouped = false;
  /** What the trades kept add up to: their mean is the usual size. */
  private volume = 0;
  private readonly capacity: number;
  private readonly keep: number;

  constructor(capacity = TAPE_ROWS, keep = TAPE_KEPT) {
    // A number of rows that is none shows the usual number.
    const rows = Number.isFinite(capacity) && capacity >= 1 ? Math.floor(capacity) : TAPE_ROWS;
    this.capacity = Math.min(TAPE_ROWS_MOST, rows);
    this.keep = Math.max(this.capacity, Number.isFinite(keep) && keep >= 1 ? Math.floor(keep) : TAPE_KEPT);
  }

  /**
   * Take trades in. Gives the rows they add on top of the ones shown (those
   * of the least size and over, of the side listed), newest first; or null
   * when the rows changed otherwise: one of the trades was made before the
   * newest kept (a trade missed and asked for afterwards) and went in where
   * its time is, or, grouped, one joined the row of the trade before it.
   */
  push(trades: readonly Trade[]): TapeRow[] | null {
    const added: TapeRow[] = [];
    let inOrder = true;
    let joined = false;
    for (const trade of trades) {
      const { time, price, volume } = trade;
      if (!Number.isFinite(time) || !Number.isFinite(price) || !(volume > 0) || !Number.isFinite(volume)) continue;
      const at = this.placeOf(time);
      const row: TapeRow = { time, price, volume, side: trade.side ?? this.sideByTickRule(price, at), large: this.isLarge(volume) };
      // Grouped, a trade made together with the one before it adds no row: that row grows.
      if (this.grouped && at > 0 && together(this.trades[at - 1], row)) joined = true;
      if (at === this.trades.length) this.trades.push(row);
      else {
        this.trades.splice(at, 0, row);
        inOrder = false;
      }
      this.volume += volume;
      if (this.lists(row, this.side)) added.push(row);
    }
    const over = this.trades.length - this.keep;
    if (over > 0) {
      for (const gone of this.trades.splice(0, over)) {
        this.volume -= gone.volume;
      }
    }
    return inOrder && !joined ? added.reverse().slice(0, this.capacity) : null;
  }

  /** The rows shown: the newest trades of the least size and over, of the side listed, newest first. */
  rows(): TapeRow[] {
    return this.rowsOf(this.side);
  }

  /**
   * What the buyers and the sellers took of the newest trades of the least
   * size and over: of both sides' whichever is listed, so the split still
   * says how they shared them.
   */
  totals(): { buy: number; sell: number } {
    let buy = 0;
    let sell = 0;
    for (const row of this.rowsOf('all')) {
      if (row.side === 'buy') buy += row.volume;
      else if (row.side === 'sell') sell += row.volume;
    }
    return { buy: tidy(buy), sell: tidy(sell) };
  }

  /**
   * The decimals every size is written to: as many as the finest of the
   * rows listed needs, of both sides (the split under one side's rows counts
   * the other's). A trade kept and not listed, older than the rows or under
   * the least size, does not write the column anew.
   */
  sizeDecimals(): number {
    let most = 0;
    for (const row of this.rowsOf('all')) {
      most = Math.max(most, sizeDecimals(row.volume));
      if (most === MOST_SIZE_DECIMALS) break;
    }
    return most;
  }

  /** Show only trades of `size` and over; 0, or what is no size, shows all. */
  setMinSize(size: number): void {
    this.minSize = Number.isFinite(size) && size > 0 ? size : 0;
  }

  getMinSize(): number {
    return this.minSize;
  }

  /** List one side's trades alone, or all (anything else is all). */
  setSide(side: TapeSide): void {
    this.side = side === 'buy' || side === 'sell' ? side : 'all';
  }

  getSide(): TapeSide {
    return this.side;
  }

  /** Whether trades made together (one moment, one price, one side) are one row, their sizes added. */
  setGroup(grouped: boolean): void {
    this.grouped = grouped === true;
  }

  isGrouped(): boolean {
    return this.grouped;
  }

  /** How many rows it shows at the most. */
  getCapacity(): number {
    return this.capacity;
  }

  /** How many trades it keeps now. */
  kept(): number {
    return this.trades.length;
  }

  clear(): void {
    this.trades = [];
    this.volume = 0;
  }

  /** Whether a row is one the tape lists: of the least size and over, and of `side`. */
  private lists(row: TapeRow, side: TapeSide): boolean {
    return row.volume >= this.minSize && (side === 'all' || row.side === side);
  }

  /** The newest rows of `side`, newest first: grouped, the trades made together as one row each. */
  private rowsOf(side: TapeSide): TapeRow[] {
    const shown: TapeRow[] = [];
    let i = this.trades.length - 1;
    while (i >= 0 && shown.length < this.capacity) {
      let row = this.trades[i--];
      if (this.grouped) {
        let volume = row.volume;
        let large = row.large;
        let count = 1;
        while (i >= 0 && together(this.trades[i], row)) {
          volume += this.trades[i].volume;
          large = large || this.trades[i].large;
          count++;
          i--;
        }
        if (count > 1) {
          const total = tidy(volume);
          row = { ...row, volume: total, large: large || this.isLarge(total) };
        }
      }
      if (this.lists(row, side)) shown.push(row);
    }
    return shown;
  }

  /** Where a trade made at `time` goes among those kept: after every one made no later. */
  private placeOf(time: number): number {
    let lo = this.trades.length;
    // Nearly every trade is the newest: looked for from the end.
    while (lo > 0 && this.trades[lo - 1].time > time) lo--;
    return lo;
  }

  private sideByTickRule(price: number, at: number): 'buy' | 'sell' | null {
    const before = this.trades[at - 1];
    if (!before) return null;
    if (price > before.price) return 'buy';
    if (price < before.price) return 'sell';
    return before.side;
  }

  private isLarge(volume: number): boolean {
    const count = this.trades.length;
    return count >= USUAL_FROM && volume >= (this.volume / count) * LARGE_TIMES;
  }
}
