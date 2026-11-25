import type { DataSeries } from '@tradecanvas/commons';

/** A divergence: the price and a line (an oscillator) turning twice, and not the same way. */
export interface Divergence {
  /** `'bullish'`: read at two lows; `'bearish'`: at two highs. */
  kind: 'bullish' | 'bearish';
  /**
   * A hidden one says the trend goes on: the price holds (a higher low, a
   * lower high) where the line does not. A regular one says it may turn: the
   * price goes on (a lower low, a higher high) where the line does not.
   */
  hidden: boolean;
  /** The bar of the first turn, and of the second. */
  from: number;
  to: number;
  /** The bar at which the second turn is known: `right` bars after it. */
  confirmed: number;
  /** The line at the two turns. */
  valueFrom: number;
  valueTo: number;
  /** The price at the two turns: the bars' lows for a bullish one, their highs for a bearish one. */
  priceFrom: number;
  priceTo: number;
}

export interface DivergenceOptions {
  /** Bars a turn has to stand out from on its left; 5. */
  left?: number;
  /** Bars on its right, which is how long a turn takes to be known; 5. */
  right?: number;
  /** The least and the most bars between the two turns; 5 and 60. */
  minBars?: number;
  maxBars?: number;
  /** Hidden divergences too; off. */
  hidden?: boolean;
}

/** The options as numbers a scan can use: whole, and at least what makes sense. */
export interface DivergenceRules {
  left: number;
  right: number;
  minBars: number;
  maxBars: number;
  hidden: boolean;
}

const whole = (value: number | undefined, fallback: number, least: number): number =>
  Number.isFinite(value) ? Math.max(least, Math.floor(value as number)) : fallback;

export function divergenceRules(options: DivergenceOptions = {}): DivergenceRules {
  return {
    left: whole(options.left, 5, 1),
    right: whole(options.right, 5, 1),
    minBars: whole(options.minBars, 5, 1),
    // Taken as it is: a most under the least leaves no two turns to read.
    maxBars: whole(options.maxBars, 60, 1),
    hidden: options.hidden === true,
  };
}

/** The turns of a line found so far: the bars of its lows and of its highs, each in order. */
export interface DivergenceTurns {
  lows: number[];
  highs: number[];
}

const valueAt = (line: ArrayLike<number | null | undefined>, i: number): number => {
  const v = line[i];
  return typeof v === 'number' && Number.isFinite(v) ? v : Number.NaN;
};

/**
 * Whether the line turns at `p`: lower (`sign` 1) or higher (`sign` -1) than
 * each of the `left` bars before it, and no higher (no lower) than each of
 * the `right` bars after. A bar with no value in that reach makes it no turn.
 */
function turnsAt(line: ArrayLike<number | null | undefined>, p: number, sign: 1 | -1, { left, right }: DivergenceRules): boolean {
  const here = valueAt(line, p) * sign;
  if (Number.isNaN(here)) return false;
  for (let k = 1; k <= left; k++) {
    const v = valueAt(line, p - k) * sign;
    if (Number.isNaN(v) || !(here < v)) return false;
  }
  for (let k = 1; k <= right; k++) {
    const v = valueAt(line, p + k) * sign;
    if (Number.isNaN(v) || !(here <= v)) return false;
  }
  return true;
}

/** The divergence two turns of one kind make, if they make one. */
function between(data: DataSeries, line: ArrayLike<number | null | undefined>, q: number, p: number, low: boolean, rules: DivergenceRules): Divergence | null {
  const apart = p - q;
  if (apart < rules.minBars || apart > rules.maxBars) return null;
  const valueFrom = valueAt(line, q);
  const valueTo = valueAt(line, p);
  const priceFrom = low ? data[q].low : data[q].high;
  const priceTo = low ? data[p].low : data[p].high;
  if (!Number.isFinite(priceFrom) || !Number.isFinite(priceTo)) return null;
  // Read as lows: "further" is lower. Highs are the same with the signs turned.
  const sign = low ? 1 : -1;
  const lineFurther = valueTo * sign < valueFrom * sign;
  const lineHolds = valueTo * sign > valueFrom * sign;
  const priceFurther = priceTo * sign < priceFrom * sign;
  const priceHolds = priceTo * sign > priceFrom * sign;
  const regular = priceFurther && lineHolds;
  const hidden = rules.hidden && priceHolds && lineFurther;
  if (!regular && !hidden) return null;
  return { kind: low ? 'bullish' : 'bearish', hidden: !regular, from: q, to: p, confirmed: p + rules.right, valueFrom, valueTo, priceFrom, priceTo };
}

/**
 * Brings `found` and `turns`, worked out on bars and a line unchanged before
 * `from`, up to `data` and `line`. A turn is decided by the `right` bars
 * after it, so the turns from `from - right` on are looked for again, and
 * the divergences that end at one of them. With nothing found and `from` 0
 * it finds them all. Both are changed in place; `found` stays in the order
 * of the second turns.
 */
export function resumeDivergences(
  data: DataSeries,
  line: ArrayLike<number | null | undefined>,
  found: Divergence[],
  turns: DivergenceTurns,
  from: number,
  rules: DivergenceRules,
): void {
  const start = Math.max(rules.left, from - rules.right);
  while (found.length > 0 && found[found.length - 1].to >= start) found.pop();
  while (turns.lows.length > 0 && turns.lows[turns.lows.length - 1] >= start) turns.lows.pop();
  while (turns.highs.length > 0 && turns.highs[turns.highs.length - 1] >= start) turns.highs.pop();
  const last = Math.min(data.length, line.length) - 1 - rules.right;
  for (let p = start; p <= last; p++) {
    for (const low of [true, false]) {
      if (!turnsAt(line, p, low ? 1 : -1, rules)) continue;
      const list = low ? turns.lows : turns.highs;
      const before = list[list.length - 1];
      list.push(p);
      if (before === undefined) continue;
      const divergence = between(data, line, before, p, low, rules);
      if (divergence) found.push(divergence);
    }
  }
}

/**
 * The divergences between the price and `line`, one value a bar (an RSI, a
 * MACD histogram; a bar with none is null). The line's turns are its lows
 * and highs that stand out from `left` bars before and `right` after; each
 * is read against the turn of the same kind before it. Bullish at two lows:
 * the price makes a lower low and the line a higher one. Bearish at two
 * highs: the price a higher high, the line a lower one. `hidden` adds the
 * ones where the price holds and the line does not. A turn, and so a
 * divergence, is known `right` bars after it (`confirmed`), and settled
 * once that bar has closed: a bar still forming can make or unmake it.
 */
export function detectDivergences(data: DataSeries, line: ArrayLike<number | null | undefined>, options: DivergenceOptions = {}): Divergence[] {
  const found: Divergence[] = [];
  resumeDivergences(data, line, found, { lows: [], highs: [] }, 0, divergenceRules(options));
  return found;
}
