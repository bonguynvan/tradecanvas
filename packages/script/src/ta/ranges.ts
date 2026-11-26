import { Ring } from '../Ring.js';
import { cell } from '../scope.js';
import { cleanPrices, num, whole, type BarPrices, type Step } from './common.js';

/** A bar's true range: its range, stretched to the close before it; the first bar's is its own range. */
export function tr(): (bar: BarPrices) => number {
  const clean = cleanPrices();
  const state = cell({ prevClose: Number.NaN });
  return (raw) => {
    const bar = clean(raw);
    if (Number.isNaN(bar.close)) return Number.NaN;
    const range = bar.high - bar.low;
    const prev = state.prevClose;
    state.prevClose = bar.close;
    if (Number.isNaN(prev)) return range;
    return Math.max(range, Math.abs(bar.high - prev), Math.abs(bar.low - prev));
  };
}

/** Average True Range, as the built-in ATR: the simple average of the first `period` true ranges, then Wilder's smoothing. */
export function atr(period = 14): (bar: BarPrices) => number {
  const p = whole(period);
  const range = tr();
  const state = cell({ count: 0, value: 0 });
  return (bar) => {
    const r = range(bar);
    if (Number.isNaN(r)) return Number.NaN;
    if (state.count < p) {
      state.value += r;
      state.count++;
      if (state.count < p) return Number.NaN;
      state.value /= p;
      return state.value;
    }
    state.value = (state.value * (p - 1) + r) / p;
    return state.value;
  };
}

export interface SupertrendValue {
  /** The line: under the bars while the trend is up, over them while it is down. */
  readonly value: number;
  /** 1 while the trend is up, -1 while it is down. */
  readonly trend: number;
}

/** Supertrend, as the built-in: bands `factor` ATRs from the bar's middle, each held until the close crosses it. */
export function supertrend(factor = 3, period = 10): (bar: BarPrices) => SupertrendValue {
  const p = whole(period);
  const range = atr(p);
  const state = cell({ prevClose: Number.NaN, upper: 0, lower: 0, line: 0 });
  const clean = cleanPrices();
  return (raw) => {
    const a = range(raw);
    const bar = clean(raw);
    const prevClose = Number.isNaN(state.prevClose) ? bar.close : state.prevClose;
    state.prevClose = bar.close;
    if (Number.isNaN(a)) return { value: Number.NaN, trend: Number.NaN };
    const middle = (bar.high + bar.low) / 2;
    const basicUpper = middle + factor * a;
    const basicLower = middle - factor * a;
    const upper = basicUpper < state.upper || prevClose > state.upper ? basicUpper : state.upper;
    const lower = basicLower > state.lower || prevClose < state.lower ? basicLower : state.lower;
    const line = state.line === state.upper
      ? (bar.close <= upper ? upper : lower)
      : (bar.close >= lower ? lower : upper);
    state.upper = upper;
    state.lower = lower;
    state.line = line;
    return { value: line, trend: line === lower ? 1 : -1 };
  };
}

/** The extreme of the last `period` values, by `better`; none while one is missing. */
function extreme(period: number, better: (a: number, b: number) => boolean): Step {
  const p = whole(period);
  const ring = new Ring(p);
  return (value) => {
    ring.push(num(value));
    if (ring.given < p) return Number.NaN;
    let best = ring.at(0);
    for (let k = 0; k < p; k++) {
      const v = ring.at(k);
      if (Number.isNaN(v)) return Number.NaN;
      if (better(v, best)) best = v;
    }
    return best;
  };
}

/** The highest of the last `period` values. */
export function highest(period: number): Step {
  return extreme(period, (a, b) => a > b);
}

/** The lowest of the last `period` values. */
export function lowest(period: number): Step {
  return extreme(period, (a, b) => a < b);
}
