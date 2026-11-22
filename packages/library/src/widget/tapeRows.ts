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

/** One trade as the tape lists it. */
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
 */
export class TapeModel {
  /** Every trade kept, by the time it was made, oldest first. */
  private trades: TapeRow[] = [];
  private minSize = 0;
  /** What the trades kept add up to: their mean is the usual size. */
  private volume = 0;
  /** How many of the trades kept need each number of decimals for their size. */
  private readonly needing: number[] = new Array<number>(MOST_SIZE_DECIMALS + 1).fill(0);
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
   * of the least size and over), newest first; or null when one of them was
   * made before the newest kept (a trade missed and asked for afterwards):
   * it went in where its time is, and the rows changed in the middle.
   */
  push(trades: readonly Trade[]): TapeRow[] | null {
    const added: TapeRow[] = [];
    let inOrder = true;
    for (const trade of trades) {
      const { time, price, volume } = trade;
      if (!Number.isFinite(time) || !Number.isFinite(price) || !(volume > 0) || !Number.isFinite(volume)) continue;
      const at = this.placeOf(time);
      const row: TapeRow = { time, price, volume, side: trade.side ?? this.sideByTickRule(price, at), large: this.isLarge(volume) };
      if (at === this.trades.length) this.trades.push(row);
      else {
        this.trades.splice(at, 0, row);
        inOrder = false;
      }
      this.volume += volume;
      this.needing[sizeDecimals(volume)]++;
      if (volume >= this.minSize) added.push(row);
    }
    const over = this.trades.length - this.keep;
    if (over > 0) {
      for (const gone of this.trades.splice(0, over)) {
        this.volume -= gone.volume;
        this.needing[sizeDecimals(gone.volume)]--;
      }
    }
    return inOrder ? added.reverse().slice(0, this.capacity) : null;
  }

  /** The rows shown: the newest trades of the least size and over, newest first. */
  rows(): TapeRow[] {
    const shown: TapeRow[] = [];
    for (let i = this.trades.length - 1; i >= 0 && shown.length < this.capacity; i--) {
      if (this.trades[i].volume >= this.minSize) shown.push(this.trades[i]);
    }
    return shown;
  }

  /** What the buyers and the sellers took of the rows shown. */
  totals(): { buy: number; sell: number } {
    let buy = 0;
    let sell = 0;
    for (const row of this.rows()) {
      if (row.side === 'buy') buy += row.volume;
      else if (row.side === 'sell') sell += row.volume;
    }
    return { buy: Number(buy.toPrecision(12)), sell: Number(sell.toPrecision(12)) };
  }

  /** The decimals every size is written to: as many as the finest of the trades kept needs. */
  sizeDecimals(): number {
    for (let decimals = MOST_SIZE_DECIMALS; decimals > 0; decimals--) {
      if (this.needing[decimals] > 0) return decimals;
    }
    return 0;
  }

  /** Show only trades of `size` and over; 0, or what is no size, shows all. */
  setMinSize(size: number): void {
    this.minSize = Number.isFinite(size) && size > 0 ? size : 0;
  }

  getMinSize(): number {
    return this.minSize;
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
    this.needing.fill(0);
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
