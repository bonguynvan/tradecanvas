import type { DataSeries } from '@tradecanvas/commons';
import { FirstQueue } from './firstQueue.js';

/** An order block: the bar the market last turned from before a move that broke a swing. */
export interface OrderBlock {
  /** `'bullish'`: a close broke a swing high; `'bearish'`: a close broke a swing low. */
  kind: 'bullish' | 'bearish';
  /** The block's bar: the lowest between the swing and the break (bullish), or the highest (bearish). */
  index: number;
  /** The bar whose close broke the swing, at which the block is known. */
  formed: number;
  /** The block's bar's high and low. */
  top: number;
  bottom: number;
  /** The swing's bar. */
  swing: number;
  /** The first bar after it to close through the block (under it, bullish; over it, bearish); null while it stands. */
  brokenAt: number | null;
}

export interface OrderBlockOptions {
  /** Bars a swing stands out from on each side, and so how many bars late it is known; 5. */
  length?: number;
}

/** A swing high or low found so far, and the bar whose close broke it. */
export interface OrderBlockSwing {
  index: number;
  price: number;
  usedAt: number | null;
}

/** What a scan keeps, to go on from a later bar. */
export interface OrderBlockState {
  blocks: OrderBlock[];
  highs: OrderBlockSwing[];
  lows: OrderBlockSwing[];
}

const DEFAULT_LENGTH = 5;

export function orderBlockLength(length: number | undefined): number {
  return Number.isFinite(length) ? Math.max(1, Math.floor(length as number)) : DEFAULT_LENGTH;
}

export function emptyOrderBlockState(): OrderBlockState {
  return { blocks: [], highs: [], lows: [] };
}

/**
 * Whether bar `p` is a swing: its `field` higher (`sign` 1) or lower (-1)
 * than each of the `length` bars before it, and no lower (no higher) than
 * each of the `length` after. A bar that is no number in that reach makes
 * it no swing.
 */
function swingAt(data: DataSeries, p: number, length: number, field: 'high' | 'low', sign: 1 | -1): boolean {
  const here = data[p][field] * sign;
  if (!Number.isFinite(here)) return false;
  for (let k = 1; k <= length; k++) {
    const left = data[p - k][field] * sign;
    const right = data[p + k][field] * sign;
    if (!(here > left) || !(here >= right)) return false;
  }
  return true;
}

/** Between the swing and the break: the bar of the lowest low (bullish) or the highest high (bearish), the latest on a tie. */
function blockBar(data: DataSeries, from: number, to: number, bullish: boolean): number | null {
  let found: number | null = null;
  for (let j = from; j <= to; j++) {
    const value = bullish ? data[j].low : data[j].high;
    if (!Number.isFinite(value)) continue;
    if (found === null) found = j;
    else {
      const best = bullish ? data[found].low : data[found].high;
      if (bullish ? value <= best : value >= best) found = j;
    }
  }
  return found;
}

/**
 * Brings `state`, worked out on bars unchanged before `from`, up to `data`:
 * the swings known, the blocks formed and the blocks broken from `from` on
 * are taken back and found again. With an empty state and `from` 0 it
 * finds them all. `state` is changed in place.
 */
export function resumeOrderBlocks(data: DataSeries, state: OrderBlockState, from: number, lengthOption?: number): void {
  const length = orderBlockLength(lengthOption);
  const start = Math.max(0, from);
  const { blocks, highs, lows } = state;
  while (blocks.length > 0 && blocks[blocks.length - 1].formed >= start) blocks.pop();
  for (const swings of [highs, lows]) {
    // A swing at `p` is known at bar `p + length`.
    while (swings.length > 0 && swings[swings.length - 1].index + length >= start) swings.pop();
    for (const swing of swings) if (swing.usedAt !== null && swing.usedAt >= start) swing.usedAt = null;
  }
  // The blocks standing: a bullish one breaks at a close under its bottom (the highest bottom first), a bearish one over its top.
  const bullish = new FirstQueue<OrderBlock>((a, b) => a.bottom > b.bottom);
  const bearish = new FirstQueue<OrderBlock>((a, b) => a.top < b.top);
  for (const block of blocks) {
    if (block.brokenAt !== null && block.brokenAt >= start) block.brokenAt = null;
    if (block.brokenAt === null) (block.kind === 'bullish' ? bullish : bearish).add(block);
  }
  for (let i = start; i < data.length; i++) {
    const close = data[i].close;
    if (Number.isFinite(close)) {
      for (let b = bullish.first; b && close < b.bottom; b = bullish.first) {
        b.brokenAt = i;
        bullish.removeFirst();
      }
      for (let b = bearish.first; b && close > b.top; b = bearish.first) {
        b.brokenAt = i;
        bearish.removeFirst();
      }
    }
    const p = i - length;
    if (p >= length) {
      if (swingAt(data, p, length, 'high', 1)) highs.push({ index: p, price: data[p].high, usedAt: null });
      if (swingAt(data, p, length, 'low', -1)) lows.push({ index: p, price: data[p].low, usedAt: null });
    }
    if (!Number.isFinite(close)) continue;
    // The latest swing of each side, while no close has broken it: a close through it makes a block.
    const high = highs[highs.length - 1];
    if (high && high.usedAt === null && close > high.price) formBlock(data, state, high, i, true, bullish);
    const low = lows[lows.length - 1];
    if (low && low.usedAt === null && close < low.price) formBlock(data, state, low, i, false, bearish);
  }
}

function formBlock(data: DataSeries, state: OrderBlockState, swing: OrderBlockSwing, at: number, up: boolean, standing: FirstQueue<OrderBlock>): void {
  swing.usedAt = at;
  const j = blockBar(data, swing.index + 1, at - 1, up);
  if (j === null) return;
  const block: OrderBlock = { kind: up ? 'bullish' : 'bearish', index: j, formed: at, top: data[j].high, bottom: data[j].low, swing: swing.index, brokenAt: null };
  state.blocks.push(block);
  standing.add(block);
}

/**
 * The order blocks of `data`, in the order they formed. A swing high (low)
 * is a bar higher (lower) than the `length` bars before it and no lower (no
 * higher) than the `length` after, known `length` bars late. When a close
 * goes over the latest swing high not yet broken, the lowest bar between the
 * swing and that close is a bullish block, its high to its low; under the
 * latest swing low, the highest bar is a bearish one. A swing makes one
 * block. A bullish block is broken by a later close under its low, a
 * bearish one by a close over its high.
 */
export function detectOrderBlocks(data: DataSeries, options: OrderBlockOptions = {}): OrderBlock[] {
  const state = emptyOrderBlockState();
  resumeOrderBlocks(data, state, 0, options.length);
  return state.blocks;
}
