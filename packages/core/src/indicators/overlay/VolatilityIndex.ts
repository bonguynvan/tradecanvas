import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam, getNumberParam } from '../params.js';
import { outputOf, rmaOf, trueRanges } from '../math.js';

/**
 * Volatility Index (Wilder's volatility system): a stop and reverse that
 * trails the most extreme close since the last turn by `mult` times the
 * average true range (Wilder's smoothing over `period` bars): under the
 * closes while long, over them while short, turning when a close crosses it.
 */
export class VolatilityIndexIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'volindex',
    name: 'Volatility Index',
    placement: 'overlay',
    defaultConfig: { period: 7, mult: 3 },
    shortName: 'VI',
    inputs: { period: { min: 1 }, mult: { label: 'ATR multiple', min: 0.1, step: 0.1 } },
    plots: [{ key: 'sar', title: 'Stop', color: 0, kind: 'dots', tone: { field: 'long' }, downColor: 1 }],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 7, 1);
    const mult = Math.max(0.1, getNumberParam(config, 'mult', 3));
    const atr = rmaOf(trueRanges(data), period);
    const points: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    let long: boolean | null = null;
    // The significant close: the highest since turning long, the lowest since turning short.
    let extreme = 0;
    for (let i = 0; i < data.length; i++) {
      const range = atr[i];
      if (range === undefined) continue;
      const close = data[i].close;
      const arc = range * mult;
      if (long === null) {
        // The first bar with a range: the side of the move so far.
        long = close >= data[0].close;
        extreme = close;
      } else if (long) {
        extreme = Math.max(extreme, close);
        if (close < extreme - arc) {
          long = false;
          extreme = close;
        }
      } else {
        extreme = Math.min(extreme, close);
        if (close > extreme + arc) {
          long = true;
          extreme = close;
        }
      }
      points[i] = { sar: long ? extreme - arc : extreme + arc, long: long ? 1 : 0 };
    }
    return outputOf(data, points);
  }
}
