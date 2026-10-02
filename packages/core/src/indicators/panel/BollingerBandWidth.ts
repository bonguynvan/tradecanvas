import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam, getNumberParam } from '../params.js';
import { closes, outputOf, pointsOf, smaOf, stdevOf, type Num } from '../math.js';

/** Bollinger BandWidth: the width of the bands relative to their middle; a squeeze shows as a low. */
export class BollingerBandWidthIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'bbw',
    name: 'Bollinger BandWidth',
    placement: 'panel',
    defaultConfig: { period: 20, stdDev: 2, source: 'close' },
    shortName: 'BBW',
    inputs: { period: { min: 2 }, stdDev: { min: 0.1, step: 0.1 }, source: { source: true } },
    plots: [{ key: 'value', title: 'BBW', color: 0 }],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 20, 2);
    const k = getNumberParam(config, 'stdDev', 2);
    const src = closes(data);
    const mean = smaOf(src, period);
    const sd = stdevOf(src, period);
    const out: Num[] = src.map((_, i) => {
      const m = mean[i];
      const s = sd[i];
      return m === undefined || s === undefined || m === 0 ? undefined : (2 * k * s) / m;
    });
    return outputOf(data, pointsOf(out));
  }
}
