import type { FootprintBar, FootprintLevel, TimeFrame, Trade } from '@tradecanvas/commons';
import { timeframeBucketStart } from '@tradecanvas/commons';

/** The automatic row is about this share of the price. */
const AUTO_ROW_SHARE = 1e-4;
/** How many bars' footprints are kept unless told otherwise. */
export const FOOTPRINT_CAPACITY = 500;
/** A price a hair under a row's edge by floating point is on the edge: by this much of a row at the least. */
const ROW_EDGE_SLACK = 1e-9;
/** The hair grows with the price counted in rows: this share of it, so a thousandth of a row at 60,000 is still told. */
const ROW_EDGE_SHARE = 1e-12;
/** Rows are never drawn more than this many to one: a row with no height on screen is not worked on for ever. */
const MAX_ROW_FACTOR = 1e9;
const NICE_STEPS = [1, 2, 5];

/** A number as it was meant: 100.30000000000001 is 100.3. */
const tidy = (value: number): number => Number(value.toPrecision(12));
const isAmount = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

/**
 * The row size the chart picks for a price: about a ten-thousandth of it,
 * rounded to 1, 2 or 5 of a power of ten (5 at 60,000, 0.01 at 100). 0 for
 * a price that is none.
 */
export function autoFootprintRow(price: number): number {
  if (!Number.isFinite(price) || price <= 0) return 0;
  const raw = price * AUTO_ROW_SHARE;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const lead = raw / magnitude;
  const nice = lead < 1.5 ? 1 : lead < 3.5 ? 2 : lead < 7.5 ? 5 : 10;
  return tidy(nice * magnitude);
}

/** Which row a price is in, counted from price 0. */
function rowIndex(price: number, rowSize: number): number {
  const rows = price / rowSize;
  return Math.floor(rows + Math.max(ROW_EDGE_SLACK, Math.abs(rows) * ROW_EDGE_SHARE));
}

/** Which row a row's own price is: the nearest, as it was written from its number. */
const rowNumber = (rowPrice: number, rowSize: number): number => Math.round(rowPrice / rowSize);

interface Cell {
  buy: number;
  sell: number;
}

interface HeldBar {
  cells: Map<number, Cell>;
  /** The rows as last read; null once a trade changed them. */
  read: FootprintBar | null;
}

/**
 * What traded at each price of each bar: the data behind the footprint
 * chart. Trades go in by the time of their bar and are counted in the row
 * of their price, on the side that took them. The newest `capacity` bars
 * are kept.
 */
export class FootprintStore {
  private readonly held = new Map<number, HeldBar>();
  /** The bars' times, oldest first. */
  private times: number[] = [];
  private rowSize = 0;
  private capacity: number;
  /** The trade before the next: what a trade with no side is told by. */
  private before: { price: number; side: 'buy' | 'sell' | null } | null = null;
  private latest = -Infinity;

  constructor(capacity = FOOTPRINT_CAPACITY) {
    this.capacity = Math.max(1, Math.floor(capacity));
  }

  /** The height of a row in price; 0 until it is set. */
  getRowSize(): number {
    return this.rowSize;
  }

  /**
   * Keep rows of `size`. Another size than it had starts the footprint
   * again (true): the rows kept cannot be cut into others. A size that is
   * none is refused.
   */
  setRowSize(size: number): boolean {
    if (!Number.isFinite(size) || size <= 0 || size === this.rowSize) return false;
    this.rowSize = size;
    this.clear();
    return true;
  }

  /**
   * Count `trade` in the bar at `time`. A trade that does not say who took
   * it is told by the trade before it (the tick rule): bought when the
   * price went up to it, sold when it went down, as the last when it stayed.
   * False for what is no trade, or cannot be told.
   */
  add(time: number, trade: Trade): boolean {
    if (this.rowSize <= 0 || !Number.isFinite(time)) return false;
    const { price, volume } = trade;
    if (!Number.isFinite(trade.time) || !Number.isFinite(price) || price <= 0 || !Number.isFinite(volume) || volume <= 0) return false;
    const side = trade.side ?? this.sideByTickRule(price);
    this.before = { price, side };
    if (!side) return false;
    const cell = this.cellAt(time, rowIndex(price, this.rowSize));
    cell[side] += volume;
    if (trade.time > this.latest) this.latest = trade.time;
    return true;
  }

  /**
   * A bar's rows as given, in place of what it had: each put in the row of
   * its price, rows of one price added up, a row with a number that cannot
   * be left out. No rows: the bar has no footprint.
   */
  set(bar: FootprintBar): void {
    if (this.rowSize <= 0 || !Number.isFinite(bar.time)) return;
    this.drop(bar.time);
    for (const level of bar.levels) {
      if (!Number.isFinite(level.price) || level.price <= 0 || !isAmount(level.buy) || !isAmount(level.sell)) continue;
      const cell = this.cellAt(bar.time, rowIndex(level.price, this.rowSize));
      cell.buy += level.buy;
      cell.sell += level.sell;
    }
  }

  /** The bar's rows, lowest price first: the same object until a trade changes them. Null for a bar with none. */
  get(time: number): FootprintBar | null {
    const bar = this.held.get(time);
    if (!bar) return null;
    if (!bar.read) {
      const levels = [...bar.cells.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([index, cell]): FootprintLevel => ({ price: tidy(index * this.rowSize), buy: tidy(cell.buy), sell: tidy(cell.sell) }));
      bar.read = { time, levels };
    }
    return bar.read;
  }

  /** Every bar it holds, oldest first. */
  bars(): FootprintBar[] {
    return this.times.map((time) => this.get(time)!);
  }

  /** When the latest trade it counted was made; -Infinity before the first. */
  latestTrade(): number {
    return this.latest;
  }

  /** Forget every bar's rows; the row size stays. */
  clear(): void {
    this.held.clear();
    this.times = [];
    this.before = null;
    this.latest = -Infinity;
  }

  /** Forget the rows and the row size: as new, for another series. */
  reset(): void {
    this.clear();
    this.rowSize = 0;
  }

  private drop(time: number): void {
    if (!this.held.delete(time)) return;
    this.times.splice(this.indexOf(time), 1);
  }

  private sideByTickRule(price: number): 'buy' | 'sell' | null {
    if (!this.before) return null;
    if (price > this.before.price) return 'buy';
    if (price < this.before.price) return 'sell';
    return this.before.side;
  }

  private cellAt(time: number, index: number): Cell {
    let bar = this.held.get(time);
    if (!bar) {
      bar = { cells: new Map(), read: null };
      this.held.set(time, bar);
      this.times.splice(this.indexOf(time), 0, time);
      this.trim();
    }
    bar.read = null;
    let cell = bar.cells.get(index);
    if (!cell) {
      cell = { buy: 0, sell: 0 };
      bar.cells.set(index, cell);
    }
    return cell;
  }

  /** Where `time` is, or would go, among the times kept. */
  private indexOf(time: number): number {
    let lo = 0;
    let hi = this.times.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.times[mid] < time) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  private trim(): void {
    while (this.times.length > this.capacity) this.held.delete(this.times.shift()!);
  }
}

/** A bar's footprint added up. */
export interface FootprintStats {
  /** What the buyers took in all. */
  buy: number;
  /** What the sellers took in all. */
  sell: number;
  /** Both together. */
  volume: number;
  /** Bought less sold. */
  delta: number;
  /** The price most traded at (the point of control); null with no rows. */
  poc: number | null;
  /** The largest amount one side took in a row. */
  maxSide: number;
  /** The largest amount traded in a row. */
  maxVolume: number;
  /** The largest difference between the sides in a row. */
  maxDelta: number;
}

/** The sums of a bar's rows, its largest cells, and the price most traded at (the lowest of equals). */
export function footprintStats(levels: readonly FootprintLevel[]): FootprintStats {
  const stats: FootprintStats = { buy: 0, sell: 0, volume: 0, delta: 0, poc: null, maxSide: 0, maxVolume: 0, maxDelta: 0 };
  for (const level of levels) {
    const total = level.buy + level.sell;
    stats.buy += level.buy;
    stats.sell += level.sell;
    if (total > stats.maxVolume) {
      stats.maxVolume = total;
      stats.poc = level.price;
    }
    stats.maxSide = Math.max(stats.maxSide, level.buy, level.sell);
    stats.maxDelta = Math.max(stats.maxDelta, Math.abs(level.buy - level.sell));
  }
  stats.buy = tidy(stats.buy);
  stats.sell = tidy(stats.sell);
  stats.volume = tidy(stats.buy + stats.sell);
  stats.delta = tidy(stats.buy - stats.sell);
  return stats;
}

/**
 * Rows of `rowSize` added up into rows `factor` times as tall, on multiples
 * of the taller row. With a factor of 1, the rows as they are.
 */
export function mergeFootprintRows(levels: readonly FootprintLevel[], rowSize: number, factor: number): readonly FootprintLevel[] {
  if (!(factor > 1) || !(rowSize > 0)) return levels;
  const tall = rowSize * factor;
  const merged: FootprintLevel[] = [];
  let at = Number.NaN;
  for (const level of levels) {
    const index = Math.floor(rowNumber(level.price, rowSize) / factor);
    if (index !== at) {
      merged.push({ price: tidy(index * tall), buy: 0, sell: 0 });
      at = index;
    }
    const row = merged[merged.length - 1];
    row.buy = tidy(row.buy + level.buy);
    row.sell = tidy(row.sell + level.sell);
  }
  return merged;
}

/**
 * How many rows to draw as one, for rows `rowPx` pixels tall on screen:
 * 1, 2, 5, 10, 20… the first that makes them `minPx` tall.
 */
export function footprintRowFactor(rowPx: number, minPx: number): number {
  if (!(rowPx > 0) || !(minPx > 0)) return rowPx > 0 ? 1 : MAX_ROW_FACTOR;
  for (let magnitude = 1; magnitude < MAX_ROW_FACTOR; magnitude *= 10) {
    for (const step of NICE_STEPS) {
      if (rowPx * step * magnitude >= minPx) return step * magnitude;
    }
  }
  return MAX_ROW_FACTOR;
}

/** Whether a row's buyers, or its sellers, outdid the other side a row apart. */
export interface FootprintImbalance {
  /** Bought here `ratio` times what was sold one row below. */
  buy: boolean;
  /** Sold here `ratio` times what was bought one row above. */
  sell: boolean;
}

/**
 * Where one side outdid the other, row by row (`levels` lowest first, in
 * rows of `rowSize`). Buyers lift the ask and sellers hit the bid a row
 * below it, so the sides are compared a row apart: what was bought at a
 * price with what was sold one row below, what was sold with what was
 * bought one row above. A row nothing traded in, between the bar's lowest
 * and highest, counts as nothing; past them there is no row to compare
 * with. A ratio of 1 or less marks none.
 */
export function footprintImbalances(levels: readonly FootprintLevel[], rowSize: number, ratio: number): FootprintImbalance[] {
  if (!(ratio > 1) || !(rowSize > 0)) return levels.map(() => ({ buy: false, sell: false }));
  const indices = levels.map((level) => rowNumber(level.price, rowSize));
  const byIndex = new Map(levels.map((level, i) => [indices[i], level]));
  const lowest = indices[0];
  const highest = indices[indices.length - 1];
  return levels.map((level, i) => {
    const index = indices[i];
    const soldBelow = index > lowest ? byIndex.get(index - 1)?.sell ?? 0 : null;
    const boughtAbove = index < highest ? byIndex.get(index + 1)?.buy ?? 0 : null;
    return {
      buy: soldBelow !== null && level.buy > 0 && level.buy >= ratio * soldBelow,
      sell: boughtAbove !== null && level.sell > 0 && level.sell >= ratio * boughtAbove,
    };
  });
}

/**
 * Footprints from trades in one call: each trade in the bar of its time
 * (`timeframe`'s, on UTC's clock, or `timeZone`'s) and the row of its
 * price. For a host that has the trades and no feed: hand the result to
 * `chart.setFootprint`.
 */
export function footprintOf(
  trades: readonly Trade[],
  timeframe: TimeFrame,
  rowSize: number,
  options: { timeZone?: string } = {},
): FootprintBar[] {
  const store = new FootprintStore(Number.MAX_SAFE_INTEGER);
  store.setRowSize(rowSize);
  // In the order they were made: a trade with no side is told by the one before it.
  const inOrder = trades.filter((t) => Number.isFinite(t.time)).sort((a, b) => a.time - b.time);
  for (const trade of inOrder) store.add(timeframeBucketStart(trade.time, timeframe, { timeZone: options.timeZone }), trade);
  return store.bars();
}

const UNITS: readonly (readonly [number, string])[] = [[1, ''], [1e3, 'K'], [1e6, 'M'], [1e9, 'B']];
const trimZeros = (text: string): string => (text.includes('.') ? text.replace(/\.?0+$/, '') : text);

/** A size in a unit: whole from 100 up, a decimal below (two below 10 with no letter). */
function inUnit(value: number, unit: number, plain: boolean): string {
  const scaled = value / unit;
  const decimals = scaled >= 100 ? 0 : scaled >= 10 || !plain ? 1 : 2;
  return trimZeros(scaled.toFixed(decimals));
}

/**
 * A cell's number, short enough for a cell: 850, 12.3, 3.46, 0.052, and
 * thousands, millions and billions by a letter (1.2K, 125K, 2.5M).
 */
export function footprintText(value: number): string {
  if (!Number.isFinite(value)) return '';
  const size = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (size === 0) return '0';
  if (size < 1) return sign + trimZeros(size >= 0.001 ? size.toFixed(3) : size.toPrecision(2));
  let at = 0;
  while (at < UNITS.length - 1 && size >= UNITS[at + 1][0]) at++;
  let text = inUnit(size, UNITS[at][0], at === 0);
  // 999,960 is 1M, not 1000K.
  if (Number(text) >= 1000 && at < UNITS.length - 1) text = inUnit(size, UNITS[++at][0], false);
  return sign + text + UNITS[at][1];
}
