import { Ring } from '../Ring.js';
import { cell } from '../scope.js';
import { holdGaps, num, whole, type Step } from './common.js';

/*
 * Each sum here does, a bar at a time, the steps the whole-series sums of
 * `@tradecanvas/core` do (`math.ts`), in the same order, so the values are
 * the chart's own. A missing value (NaN) is handled as there: a simple or
 * weighted average needs `period` numbers in a row, a smoothing skips it.
 */

/** Simple moving average of the last `period` values; a gap starts it again. */
export function sma(period: number): Step {
  const p = whole(period);
  const ring = new Ring(p);
  const state = cell({ sum: 0 });
  return (value) => {
    const v = num(value);
    ring.push(v);
    if (Number.isNaN(v)) {
      state.sum = 0;
      return Number.NaN;
    }
    state.sum += v;
    if (ring.numbersInRow > p) state.sum -= ring.at(p);
    return ring.numbersInRow >= p ? state.sum / p : Number.NaN;
  };
}

/** Starts as the simple average of the first `period` values, then moves `alpha` of the way to each new one; a gap keeps the value and gives none. */
function smoothing(period: number, alpha: (p: number) => number): Step {
  const p = whole(period);
  const a = alpha(p);
  const state = cell({ seed: 0, count: 0, value: Number.NaN });
  return (value) => {
    const v = num(value);
    if (Number.isNaN(v)) return Number.NaN;
    if (Number.isNaN(state.value)) {
      state.seed += v;
      state.count++;
      if (state.count === p) state.value = state.seed / p;
      return state.value;
    }
    state.value += a * (v - state.value);
    return state.value;
  };
}

/** Exponential moving average, started as the simple average of its first `period` values. */
export function ema(period: number): Step {
  return smoothing(period, (p) => 2 / (p + 1));
}

/** Wilder's smoothing (RMA, SMMA): an EMA moving 1 / period of the way. */
export function rma(period: number): Step {
  return smoothing(period, (p) => 1 / p);
}

/** The last `period` values, oldest first, or null when one of them is missing. */
function windowOf(ring: Ring, p: number): number[] | null {
  if (ring.given < p) return null;
  const values: number[] = new Array(p);
  for (let k = 0; k < p; k++) {
    const v = ring.at(p - 1 - k);
    if (Number.isNaN(v)) return null;
    values[k] = v;
  }
  return values;
}

/** Linearly weighted moving average: the newest of `period` values weighs `period`, the oldest 1. */
export function wma(period: number): Step {
  const p = whole(period);
  const ring = new Ring(p);
  const denominator = (p * (p + 1)) / 2;
  return (value) => {
    ring.push(num(value));
    const values = windowOf(ring, p);
    if (!values) return Number.NaN;
    let sum = 0;
    for (let k = 0; k < p; k++) sum += values[k] * (k + 1);
    return sum / denominator;
  };
}

/** Standard deviation of the whole population of the last `period` values. */
export function stdev(period: number): Step {
  const p = whole(period);
  const ring = new Ring(p);
  return (value) => {
    ring.push(num(value));
    const values = windowOf(ring, p);
    if (!values) return Number.NaN;
    let sum = 0;
    let sumSq = 0;
    for (const v of values) {
      sum += v;
      sumSq += v * v;
    }
    const mean = sum / p;
    return Math.sqrt(Math.max(0, sumSq / p - mean * mean));
  };
}

/** Hull moving average: a weighted average of twice the half-period one less the full one, over the root of the period (each at least 2), as the built-in HMA. */
export function hma(period: number): Step {
  return holdGaps(hullOf(period), Number.NaN);
}

function hullOf(period: number): Step {
  const p = Math.max(2, whole(period));
  const half = wma(Math.max(2, Math.floor(p / 2)));
  const full = wma(p);
  const smooth = wma(Math.max(2, Math.floor(Math.sqrt(p))));
  return (value) => {
    const h = half(value);
    const f = full(value);
    return smooth(Number.isNaN(h) || Number.isNaN(f) ? Number.NaN : 2 * h - f);
  };
}

/** Volume-weighted moving average of the last `period` bars, as the built-in VWMA: none while their volume is nothing. */
export function vwma(period: number): (value: number, volume: number) => number {
  const p = whole(period);
  const prices = new Ring(p);
  const volumes = new Ring(p);
  const state = cell({ pv: 0, volume: 0, last: Number.NaN });
  return (value, volume) => {
    // A missing price is computed over as the last one, and gives none itself.
    const given = num(value);
    if (!Number.isNaN(given)) state.last = given;
    const v = state.last;
    if (Number.isNaN(v)) return Number.NaN;
    const vol = Number.isFinite(volume) ? volume : 0;
    prices.push(v);
    volumes.push(vol);
    state.pv += v * vol;
    state.volume += vol;
    if (prices.given > p) {
      state.pv -= prices.at(p) * volumes.at(p);
      state.volume -= volumes.at(p);
    }
    if (Number.isNaN(given)) return Number.NaN;
    return prices.given >= p && state.volume > 0 ? state.pv / state.volume : Number.NaN;
  };
}
