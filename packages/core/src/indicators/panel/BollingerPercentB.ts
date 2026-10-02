import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam, getNumberParam } from '../params.js';
import { closes, outputOf, pointsOf, smaOf, stdevOf, type Num } from '../math.js';

/**
 * Bollinger %B: where the close sits in its Bollinger Bands, 0 at the lower
 * band, 1 at the upper (beyond them below 0 or above 1).
 */
export class BollingerPercentBIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'bbpb',
    name: 'Bollinger Bands %B',
    placement: 'panel',
    defaultConfig: { period: 20, stdDev: 2, source: 'close' },
    shortName: '%B',
    inputs: { period: { min: 2 }, stdDev: { min: 0.1, step: 0.1 }, source: { source: true } },
    plots: [{ key: 'value', title: '%B', color: 0 }],
    levels: [0, 0.5, 1],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 20, 2);
    const k = getNumberParam(config, 'stdDev', 2);
    const src = closes(data);
    const mean = smaOf(src, period);
    const sd = stdevOf(src, period);
    const out: Num[] = src.map((c, i) => {
      const m = mean[i];
      const s = sd[i];
      if (m === undefined || s === undefined || s === 0) return undefined;
      return (c - (m - k * s)) / (2 * k * s);
    });
    return outputOf(data, pointsOf(out));
  }
}
