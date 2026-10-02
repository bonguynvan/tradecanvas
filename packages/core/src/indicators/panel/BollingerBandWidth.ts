import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorValue } from '@tradecanvas/commons';
import { PointwiseIndicator } from '../PointwiseIndicator.js';
import { getIntParam, getNumberParam } from '../params.js';
import { closeStatsAt } from '../math.js';

/** Bollinger BandWidth: the width of the bands relative to their middle; a squeeze shows as a low. */
export class BollingerBandWidthIndicator extends PointwiseIndicator<{ period: number; k: number }> {
  descriptor: IndicatorDescriptor = {
    id: 'bbw',
    name: 'Bollinger BandWidth',
    placement: 'panel',
    defaultConfig: { period: 20, stdDev: 2, source: 'close' },
    shortName: 'BBW',
    inputs: { period: { min: 2 }, stdDev: { min: 0.1, step: 0.1 }, source: { source: true } },
    plots: [{ key: 'value', title: 'BBW', color: 0 }],
  };

  protected read(config: IndicatorConfig) {
    return { period: getIntParam(config, 'period', 20, 2), k: getNumberParam(config, 'stdDev', 2) };
  }

  protected pointAt(data: DataSeries, i: number, { period, k }: { period: number; k: number }): IndicatorValue | null {
    const stats = closeStatsAt(data, i, period);
    return !stats || stats.mean === 0 ? null : { value: (2 * k * stats.sd) / stats.mean };
  }
}
