import type { OHLCBar } from '@tradecanvas/commons';

/**
 * Bars a transform that reshapes the series by a size (Renko's box, Kagi's
 * reversal, a point & figure box, the range of range bars) may make from the
 * source bars before the last, and the last bar as many again on its own.
 * The transforms run again on every tick, and a size a user types or a link
 * carries may be far too small for the prices: past this the size is raised,
 * rather than a tab filling its memory with millions of bars.
 */
export const MAX_RESHAPED_BARS = 100_000;

/** The 1-2-5 steps a size too small is raised by: 2, 5, 10, 20, 50… times itself. */
const SIZE_STEPS = [1, 2, 5] as const;

/** Digits a raised size is kept to, so it reads as typed (0.35, not 0.35000000000000003). */
const SIZE_DIGITS = 15;

/**
 * The `n`th size tried for `asked`: itself, then 2, 5, 10, 20… times it, kept
 * to 15 significant digits; past the largest number, Infinity.
 */
export function sizeAt(asked: number, n: number): number {
  if (n === 0) return asked;
  const step = SIZE_STEPS[n % SIZE_STEPS.length];
  const tens = Math.floor(n / SIZE_STEPS.length);
  const multiple = step * 10 ** tens;
  if (Number.isFinite(multiple)) return Number((asked * multiple).toPrecision(SIZE_DIGITS));
  // A size near the smallest number (1e-310) needs a multiple past the largest one to reach the prices: the
  // power of ten is added to the size's own exponent instead.
  const [digits, exponent] = asked.toExponential().split('e');
  return Number(`${(Number(digits) * step).toPrecision(SIZE_DIGITS)}e${Number(exponent) + tens}`);
}

/**
 * The most bars a walk over `length` source bars may have made once source
 * bar `i` is done, `before` of them made by the bars before it: the cap, and
 * on the last bar as many again on its own, so a tick on it seldom moves the
 * size and reshapes the bars already drawn.
 */
export function barLimit(i: number, length: number, before: number): number {
  return i === length - 1 ? before + MAX_RESHAPED_BARS : MAX_RESHAPED_BARS;
}

/** Takes a bar a transform has made. */
export type LayBar = (bar: OHLCBar) => void;

/**
 * Walks the series at `size`, handing each bar it makes to `lay` when given.
 * `capped`, it stops before a bar past the cap (barLimit) and is false;
 * uncapped, it makes every bar and is true, unless the size is too small for
 * the prices to be walked at all.
 */
export type ReshapeWalk = (size: number, capped: boolean, lay?: LayBar) => boolean;

/** The bars a transform made, and the size it made them at. */
export interface Reshaped {
  bars: OHLCBar[];
  size: number;
}

/**
 * The bars `walk` makes at `asked`: in one walk when they keep to the cap, as
 * almost every size does, else at the first of 2, 5, 10, 20… times it that
 * makes no more. None, at a size of Infinity, when no size does.
 */
export function reshape(asked: number, walk: ReshapeWalk): Reshaped {
  return reshapeOr(asked, walk, () => ({ bars: [], size: Infinity }));
}

/**
 * `reshape` for a transform that makes one bar a source bar at most (Kagi,
 * point & figure), whose bars the series bounds anyway: when no size keeps to
 * the cap (prices all at 0 for a reversal in percent, a reversal of no boxes),
 * or `asked` is no number above 0, every bar is laid at `asked`, rather than
 * the bars cut off at the cap.
 */
export function reshapeOneABar(asked: number, walk: ReshapeWalk): Reshaped {
  return reshapeOr(asked, walk, () => ({ bars: laid(asked, walk, false) ?? [], size: asked }));
}

/** The bars at `asked` or the size it is raised to; `noneFits` when no size keeps to the cap. */
function reshapeOr(asked: number, walk: ReshapeWalk, noneFits: () => Reshaped): Reshaped {
  const atAsked = laid(asked, walk, true);
  if (atAsked) return { bars: atAsked, size: asked };
  const size = raisedSize(asked, (s) => walk(s, true));
  const atRaised = Number.isFinite(size) ? laid(size, walk, true) : null;
  return atRaised ? { bars: atRaised, size } : noneFits();
}

/** The bars `walk` lays at `size`, or null when it stops: capped, past the cap, or at a size too small to walk. */
function laid(size: number, walk: ReshapeWalk, capped: boolean): OHLCBar[] | null {
  const bars: OHLCBar[] = [];
  return walk(size, capped, (bar) => { bars.push(bar); }) ? bars : null;
}

/**
 * The first of 2, 5, 10, 20… times `asked` at which `fits`, for a size whose
 * bars pass the cap; Infinity when none would (not even the largest number
 * fits) or `asked` is no number above 0. A larger size makes no more bars, so
 * rather than walk the series at every step (a size near the smallest number
 * is some 950 steps from one that fits), the steps are tried 1, 2, 4, 8… on
 * until one fits, then the gap is halved back to the first that does.
 */
function raisedSize(asked: number, fits: (size: number) => boolean): number {
  if (!(asked > 0)) return Infinity;
  // A step past the largest number counts as fitting, so the search ends; it makes no bars.
  const fitsAt = (n: number) => {
    const size = sizeAt(asked, n);
    return size === Infinity || fits(size);
  };
  // Most sizes too small fit at twice themselves; only past that is it worth a walk to ask whether any size fits.
  if (fitsAt(1)) return sizeAt(asked, 1);
  if (!fits(Number.MAX_VALUE)) return Infinity;
  let tooSmall = 1;
  let enough = 2;
  while (!fitsAt(enough)) {
    tooSmall = enough;
    enough *= 2;
  }
  while (enough - tooSmall > 1) {
    const mid = Math.floor((tooSmall + enough) / 2);
    if (fitsAt(mid)) enough = mid;
    else tooSmall = mid;
  }
  return sizeAt(asked, enough);
}
