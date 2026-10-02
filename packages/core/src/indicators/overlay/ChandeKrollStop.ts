import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam, getNumberParam } from '../params.js';
import { highAt, highestAt, lowAt, lowestAt, outputOf, rmaOf, trueRanges, type Num } from '../math.js';

interface State { atr: Num[]; firstHigh: Num[]; firstLow: Num[] }

/**
 * Chande Kroll Stop: trailing stops from the highest high and lowest low of
 * `p` bars, `x` ATRs inside them, then the most extreme of those over `q`
 * bars. Stop Long sits under price in an uptrend, Stop Short above it in a
 * downtrend.
 */
export class ChandeKrollStopIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'cks',
    name: 'Chande Kroll Stop',
    placement: 'overlay',
    defaultConfig: { p: 10, x: 1, q: 9 },
    shortName: 'CKS',
    inputs: { p: { label: 'ATR length', min: 1 }, x: { label: 'ATR multiplier', min: 0, step: 0.1 }, q: { label: 'Stop length', min: 1 } },
    plots: [{ key: 'long', title: 'Stop Long', color: 0 }, { key: 'short', title: 'Stop Short', color: 1 }],
  };

  /** ATR and the first stops behind each output, so a tick extends them. */
  private states = new WeakMap<IndicatorOutput, State>();

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const p = getIntParam(config, 'p', 10, 1);
    const x = getNumberParam(config, 'x', 1);
    const q = getIntParam(config, 'q', 9, 1);
    const atr = rmaOf(trueRanges(data), p);
    const state: State = { atr, firstHigh: [], firstLow: [] };
    for (let i = 0; i < data.length; i++) firstStops(data, state, i, p, x);
    const output = outputOf(data, data.map((_, i) => stops(state, i, q)));
    this.states.set(output, state);
    return output;
  }

  update(data: DataSeries, config: IndicatorConfig, prev: IndicatorOutput, from: number): IndicatorOutput | null {
    const state = this.states.get(prev);
    if (!state || !this.canResume(data, prev, from)) return null;
    let atr = state.atr[from - 1];
    if (atr === undefined) return null;
    const p = getIntParam(config, 'p', 10, 1);
    const x = getNumberParam(config, 'x', 1);
    const q = getIntParam(config, 'q', 9, 1);
    for (let i = from; i < data.length; i++) {
      const prevClose = data[i - 1].close;
      const tr = Math.max(data[i].high - data[i].low, Math.abs(data[i].high - prevClose), Math.abs(data[i].low - prevClose));
      atr += (tr - atr) / p;
      state.atr[i] = atr;
      firstStops(data, state, i, p, x);
      this.writePoint(prev, data, i, stops(state, i, q));
    }
    return prev;
  }
}

/** Bar `i`'s first stops: `x` ATRs inside the range of the last `p` bars. */
function firstStops(data: DataSeries, state: State, i: number, p: number, x: number): void {
  const atr = state.atr[i];
  const high = highAt(data, i, p);
  const low = lowAt(data, i, p);
  state.firstHigh[i] = high !== undefined && atr !== undefined ? high - x * atr : undefined;
  state.firstLow[i] = low !== undefined && atr !== undefined ? low + x * atr : undefined;
}

/** Bar `i`'s stops: the most extreme first stops of the last `q` bars. */
function stops(state: State, i: number, q: number): IndicatorValue | null {
  const short = highestAt(state.firstHigh, i, q);
  const long = lowestAt(state.firstLow, i, q);
  return short !== undefined && long !== undefined ? { long, short } : null;
}
