import { Ring } from '../Ring.js';
import { cell } from '../scope.js';
import { ema, sma, stdev } from './averages.js';
import { holdGaps, num, whole, type Step } from './common.js';

/** Relative Strength Index, 0 to 100, as the built-in RSI: Wilder's smoothing of the gains and losses, started as their simple average. */
export function rsi(period = 14): Step {
  return holdGaps(rsiOf(period), Number.NaN);
}

function rsiOf(period: number): Step {
  const p = whole(period);
  const state = cell({ prev: Number.NaN, count: 0, gain: 0, loss: 0 });
  const value = () => (state.loss === 0 ? 100 : 100 - 100 / (1 + state.gain / state.loss));
  return (input) => {
    const v = num(input);
    if (Number.isNaN(v)) return Number.NaN;
    if (Number.isNaN(state.prev)) {
      state.prev = v;
      return Number.NaN;
    }
    const change = v - state.prev;
    state.prev = v;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    if (state.count < p) {
      state.gain += gain;
      state.loss += loss;
      state.count++;
      if (state.count < p) return Number.NaN;
      state.gain /= p;
      state.loss /= p;
      return value();
    }
    state.gain = (state.gain * (p - 1) + gain) / p;
    state.loss = (state.loss * (p - 1) + loss) / p;
    return value();
  };
}

export interface MacdValue {
  readonly macd: number;
  readonly signal: number;
  readonly histogram: number;
}

/**
 * MACD: the fast average less the slow one, its signal line and the one less
 * the other. Its averages start as simple ones, as every EMA here does (the
 * built-in MACD indicator starts its own at the first close, so its first
 * hundred bars or so differ by a hair).
 */
export function macd(fast = 12, slow = 26, signal = 9): (value: number) => MacdValue {
  return holdGaps(macdOf(fast, slow, signal), { macd: Number.NaN, signal: Number.NaN, histogram: Number.NaN });
}

function macdOf(fast: number, slow: number, signal: number): (value: number) => MacdValue {
  const fastStep = ema(fast);
  const slowStep = ema(slow);
  const signalStep = ema(signal);
  return (value) => {
    const f = fastStep(value);
    const s = slowStep(value);
    const line = Number.isNaN(f) || Number.isNaN(s) ? Number.NaN : f - s;
    const sig = signalStep(line);
    return { macd: line, signal: sig, histogram: line - sig };
  };
}

export interface BandsValue {
  readonly basis: number;
  readonly upper: number;
  readonly lower: number;
}

/** Bollinger Bands: a simple average and the lines `mult` standard deviations either side of it. */
export function bb(period = 20, mult = 2): (value: number) => BandsValue {
  return holdGaps(bandsOf(period, mult), { basis: Number.NaN, upper: Number.NaN, lower: Number.NaN });
}

function bandsOf(period: number, mult: number): (value: number) => BandsValue {
  const basisStep = sma(period);
  const devStep = stdev(period);
  return (value) => {
    const basis = basisStep(value);
    const dev = mult * devStep(value);
    return { basis, upper: basis + dev, lower: basis - dev };
  };
}

/** How far a value is from the one `bars` before it. */
export function change(bars = 1): Step {
  const n = whole(bars);
  const ring = new Ring(n);
  return (value) => {
    ring.push(num(value));
    return ring.at(0) - ring.at(n);
  };
}

/** Momentum: how far a value is from the one `period` bars before it. */
export function mom(period = 10): Step {
  return holdGaps(change(period), Number.NaN);
}

/** Rate of change in per cent from the value `period` bars before, as the built-in ROC: 0 from a value of 0. */
export function roc(period = 12): Step {
  return holdGaps(rocOf(period), Number.NaN);
}

function rocOf(period: number): Step {
  const n = whole(period);
  const ring = new Ring(n);
  return (value) => {
    ring.push(num(value));
    const now = ring.at(0);
    const before = ring.at(n);
    if (Number.isNaN(now) || Number.isNaN(before)) return Number.NaN;
    return before === 0 ? 0 : ((now - before) / before) * 100;
  };
}
