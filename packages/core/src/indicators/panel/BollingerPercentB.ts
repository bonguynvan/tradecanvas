import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorValue } from '@tradecanvas/commons';
import { PointwiseIndicator } from '../PointwiseIndicator.js';
import { getIntParam, getNumberParam } from '../params.js';
import { closeStatsAt } from '../math.js';

/**
 * Bollinger %B: where the close sits in its Bollinger Bands, 0 at the lower
 * band, 1 at the upper (beyond them below 0 or above 1).
 */
export class BollingerPercentBIndicator extends PointwiseIndicator<{ period: number; k: number }> {
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

  protected read(config: IndicatorConfig) {
    return { period: getIntParam(config, 'period', 20, 2), k: getNumberParam(config, 'stdDev', 2) };
  }

  protected pointAt(data: DataSeries, i: number, { period, k }: { period: number; k: number }): IndicatorValue | null {
    const stats = closeStatsAt(data, i, period);
    if (!stats || stats.sd === 0) return null;
    return { value: (data[i].close - (stats.mean - k * stats.sd)) / (2 * k * stats.sd) };
  }
}
