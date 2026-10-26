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

/** The `n`th multiple a size is tried at: 1, 2, 5, 10, 20, 50… */
function sizeMultiple(n: number): number {
  return SIZE_STEPS[n % SIZE_STEPS.length] * 10 ** Math.floor(n / SIZE_STEPS.length);
}

/** The `n`th size tried for `asked`: itself, then 2, 5, 10, 20… times it, kept to 15 significant digits. */
export function sizeAt(asked: number, n: number): number {
  return n === 0 ? asked : Number((asked * sizeMultiple(n)).toPrecision(SIZE_DIGITS));
}

/**
 * The size a transform builds on: `asked`, or the first of 2, 5, 10, 20…
 * times it at which `fits` says its bars keep to MAX_RESHAPED_BARS. A size
 * that is no number above 0 is given back as it is (nothing raises it), and
 * one whose multiples pass the largest number before one fits ends as
 * Infinity, at which a transform makes no bars.
 */
export function cappedSize(asked: number, fits: (size: number) => boolean): number {
  if (!(asked > 0)) return asked;
  for (let n = 0; ; n++) {
    const size = sizeAt(asked, n);
    if (size === Infinity || fits(size)) return size;
  }
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

/**
 * Whether `length` source bars keep to the cap at any size, for a transform
 * that makes at most one bar a source bar (Kagi, point & figure): the first
 * bar starts the walk, and the last makes one at most on its own.
 */
export function underCapAtAnySize(length: number): boolean {
  return length - 2 <= MAX_RESHAPED_BARS;
}
