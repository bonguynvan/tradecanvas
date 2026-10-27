import type { DataSeries, OHLCBar } from '@tradecanvas/commons';

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

/** The bars a transform made, the size it made them at, and that size's step from the one asked (`sizeAt`). */
export interface Reshaped {
  bars: OHLCBar[];
  size: number;
  step: number;
}

/** What a memo knows of the series a size was raised on. */
interface ReachedStep {
  /** The transform, with what else shapes its walk (Kagi's mode, point & figure's reversal). */
  kind: string;
  asked: number;
  /** The step it was raised to: `sizeAt(asked, step)`. */
  step: number;
  /** The series' first bar's time and its length. */
  first: number;
  length: number;
  /** Its last bar's high and low: a narrower bar there may make fewer bars. */
  high: number;
  low: number;
}

/**
 * Where the last run of a transform raised its size to, for the next run on
 * the same series after a tick or a new bar. A chart builds a reshaped type
 * again on every tick, and a size the bars outgrew was walked to the cap at
 * each step below the one that fits, every time; with a memo the walk starts
 * at that step. It is used only for the same transform and size asked, on a
 * series with the same first bar, no fewer bars, and the bar that was last
 * as wide or wider, which make no fewer bars at any step. A size the series
 * would fit at again after a correction further back stays raised until
 * `clear()`, which a chart calls when its series is replaced.
 */
export class ReshapeMemo {
  private reached: ReachedStep | null = null;

  /** Forget the step reached: the next run starts at the size asked. */
  clear(): void {
    this.reached = null;
  }

  /** The step a run of `kind` at `asked` on `data` starts at: the one reached on that series, or 0. */
  startStep(kind: string, asked: number, data: DataSeries): number {
    const reached = this.reached;
    if (!reached || reached.kind !== kind || reached.asked !== asked) return 0;
    if (data.length < reached.length || data[0].time !== reached.first) return 0;
    const was = data[reached.length - 1];
    return was.high >= reached.high && was.low <= reached.low ? reached.step : 0;
  }

  /** The step a run of `kind` at `asked` reached on `data`. */
  keep(kind: string, asked: number, step: number, data: DataSeries): void {
    const last = data[data.length - 1];
    this.reached = last ? { kind, asked, step, first: data[0].time, length: data.length, high: last.high, low: last.low } : null;
  }
}

/** `run` from the step `memo` reached for `kind` at `asked` on `data`, which it then keeps; from the size asked without a memo. */
export function fromReached(memo: ReshapeMemo | undefined, kind: string, asked: number, data: DataSeries, run: (start: number) => Reshaped): Reshaped {
  const reshaped = run(memo?.startStep(kind, asked, data) ?? 0);
  memo?.keep(kind, asked, reshaped.step, data);
  return reshaped;
}

/**
 * The bars `walk` makes at `asked`: in one walk when they keep to the cap, as
 * almost every size does, else at the first of 2, 5, 10, 20… times it that
 * makes no more. None, at a size of Infinity, when no size does. `start`
 * skips the steps before it, known to make too many (`ReshapeMemo`).
 */
export function reshape(asked: number, walk: ReshapeWalk, start = 0): Reshaped {
  return reshapeOr(asked, walk, () => ({ bars: [], size: Infinity, step: 0 }), start);
}

/**
 * `reshape` for a transform that makes one bar a source bar at most (Kagi,
 * point & figure), whose bars the series bounds anyway: when no size keeps to
 * the cap (prices all at 0 for a reversal in percent, a reversal of no boxes),
 * or `asked` is no number above 0, every bar is laid at `asked`, rather than
 * the bars cut off at the cap.
 */
export function reshapeOneABar(asked: number, walk: ReshapeWalk, start = 0): Reshaped {
  return reshapeOr(asked, walk, () => ({ bars: laid(asked, walk, false) ?? [], size: asked, step: 0 }), start);
}

/** The bars at step `start` of `asked` or the step it is raised to; `noneFits` when no size keeps to the cap. */
function reshapeOr(asked: number, walk: ReshapeWalk, noneFits: () => Reshaped, start: number): Reshaped {
  const first = sizeAt(asked, start);
  const atFirst = laid(first, walk, true);
  if (atFirst) return { bars: atFirst, size: first, step: start };
  const step = raisedStep(asked, (s) => walk(s, true), start);
  const size = Number.isFinite(step) ? sizeAt(asked, step) : Infinity;
  const atRaised = Number.isFinite(size) ? laid(size, walk, true) : null;
  return atRaised ? { bars: atRaised, size, step } : noneFits();
}

/** The bars `walk` lays at `size`, or null when it stops: capped, past the cap, or at a size too small to walk. */
function laid(size: number, walk: ReshapeWalk, capped: boolean): OHLCBar[] | null {
  const bars: OHLCBar[] = [];
  return walk(size, capped, (bar) => { bars.push(bar); }) ? bars : null;
}

/**
 * The first step of `asked` after `from` (a step whose bars pass the cap) at
 * which `fits`; Infinity when none would (not even the largest number fits)
 * or `asked` is no number above 0. A larger size makes no more bars, so
 * rather than walk the series at every step (a size near the smallest number
 * is some 950 steps from one that fits), the steps after `from` are tried
 * 1, 2, 4, 8… on until one fits, then the gap is halved back to the first that does.
 */
function raisedStep(asked: number, fits: (size: number) => boolean, from: number): number {
  if (!(asked > 0)) return Infinity;
  // A step past the largest number counts as fitting, so the search ends; it makes no bars.
  const fitsAt = (n: number) => {
    const size = sizeAt(asked, n);
    return size === Infinity || fits(size);
  };
  // Most sizes too small fit at twice themselves; only past that is it worth a walk to ask whether any size fits.
  if (fitsAt(from + 1)) return from + 1;
  if (!fits(Number.MAX_VALUE)) return Infinity;
  let tooSmall = from + 1;
  let enough = from + 2;
  while (!fitsAt(enough)) {
    tooSmall = enough;
    enough = from + 2 * (enough - from);
  }
  while (enough - tooSmall > 1) {
    const mid = Math.floor((tooSmall + enough) / 2);
    if (fitsAt(mid)) enough = mid;
    else tooSmall = mid;
  }
  return enough;
}
