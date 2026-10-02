import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam, getNumberParam } from '../params.js';
import { highestAt, lowestAt, outputOf, rmaOf, trueRanges, type Num } from '../math.js';
import type { IndicatorValue } from '@tradecanvas/commons';

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

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const p = getIntParam(config, 'p', 10, 1);
    const x = getNumberParam(config, 'x', 1);
    const q = getIntParam(config, 'q', 9, 1);
    const atr = rmaOf(trueRanges(data), p);
    const highs = data.map((b) => b.high);
    const lows = data.map((b) => b.low);
    const firstHigh: Num[] = data.map((_, i) => {
      const h = highestAt(highs, i, p);
      return h !== undefined && atr[i] !== undefined ? h - x * atr[i]! : undefined;
    });
    const firstLow: Num[] = data.map((_, i) => {
      const l = lowestAt(lows, i, p);
      return l !== undefined && atr[i] !== undefined ? l + x * atr[i]! : undefined;
    });
    const points: (IndicatorValue | null)[] = data.map((_, i) => {
      const short = highestAt(firstHigh, i, q);
      const long = lowestAt(firstLow, i, q);
      return short !== undefined && long !== undefined ? { long, short } : null;
    });
    return outputOf(data, points);
  }
}
