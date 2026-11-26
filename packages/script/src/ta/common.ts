import { cell } from '../scope.js';

/** A value a sum takes: a number, or none (NaN) for anything that is not a finite number. */
export function num(value: number): number {
  return Number.isFinite(value) ? value : Number.NaN;
}

/** A period of at least one, as the built-in indicators take one: its whole part. */
export function whole(period: number): number {
  return Number.isFinite(period) ? Math.max(1, Math.floor(period)) : 1;
}

/** A sum a bar at a time: given this bar's value, it gives this bar's result. */
export type Step = (value: number) => number;

/** The prices of a bar a sum of ranges reads. */
export interface BarPrices {
  readonly high: number;
  readonly low: number;
  readonly close: number;
}

/**
 * A sum over a value a bar as `@tradecanvas/core`'s `ta` runs a built-in
 * indicator over one: from its first number on, a missing value is computed
 * over as the last number (no change on that bar) and gives none itself.
 */
export function holdGaps<T>(step: (value: number) => T, none: T): (value: number) => T {
  const state = cell({ last: Number.NaN });
  return (value) => {
    const v = num(value);
    if (!Number.isNaN(v)) {
      state.last = v;
      return step(v);
    }
    if (!Number.isNaN(state.last)) step(state.last);
    return none;
  };
}

/**
 * A bar's prices as the built-in indicators are given them: a close that is
 * no number is the close before, another price that is none is its close.
 */
export function cleanPrices(): (bar: BarPrices) => BarPrices {
  const state = cell({ close: Number.NaN });
  return (bar) => {
    const close = Number.isFinite(bar.close) ? bar.close : state.close;
    state.close = close;
    const price = (value: number) => (Number.isFinite(value) ? value : close);
    return { high: price(bar.high), low: price(bar.low), close };
  };
}
