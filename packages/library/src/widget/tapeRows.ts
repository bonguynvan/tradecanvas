import type { Trade } from '@tradecanvas/commons';

/** How many rows the tape shows unless told otherwise. */
export const TAPE_ROWS = 200;
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
 * the least size, newest first. A trade that does not say who took it is
 * told by the trade before it: bought when the price went up to it, sold
 * when it went down, as the last when it stayed. More trades are kept than
 * shown (`keep`), so lowering the least size brings the smaller ones back.
 */
export class TapeModel {
  /** Every trade kept, oldest first. */
  private trades: TapeRow[] = [];
  private minSize = 0;
  /** What the trades kept add up to: their mean is the usual size. */
  private volume = 0;
  private readonly capacity: number;
  private readonly keep: number;

  constructor(capacity = TAPE_ROWS, keep = TAPE_KEPT) {
    this.capacity = Math.max(1, Math.floor(capacity));
    this.keep = Math.max(this.capacity, Math.floor(keep));
  }

  /**
   * Take trades in, oldest first. Gives the rows they add to the ones shown
   * (those of the least size and over), newest first.
   */
  push(trades: readonly Trade[]): TapeRow[] {
    const added: TapeRow[] = [];
    for (const trade of trades) {
      const { time, price, volume } = trade;
      if (!Number.isFinite(time) || !Number.isFinite(price) || !(volume > 0) || !Number.isFinite(volume)) continue;
      const row: TapeRow = { time, price, volume, side: trade.side ?? this.sideByTickRule(price), large: this.isLarge(volume) };
      this.trades.push(row);
      this.volume += volume;
      if (volume >= this.minSize) added.push(row);
    }
    const over = this.trades.length - this.keep;
    if (over > 0) {
      for (const gone of this.trades.splice(0, over)) this.volume -= gone.volume;
    }
    return added.reverse().slice(0, this.capacity);
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
  }

  private sideByTickRule(price: number): 'buy' | 'sell' | null {
    const before = this.trades[this.trades.length - 1];
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
