import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorValue } from '@tradecanvas/commons';
import { PointwiseIndicator } from '../PointwiseIndicator.js';
import { getIntParam } from '../params.js';
import { regressionAt } from '../math.js';

/** Trend Strength Index: the correlation of the last `period` closes with time, −1 to 1. */
export class TrendStrengthIndexIndicator extends PointwiseIndicator<number> {
  descriptor: IndicatorDescriptor = {
    id: 'trendstrength',
    name: 'Trend Strength Index',
    placement: 'panel',
    defaultConfig: { period: 14 },
    shortName: 'TSI (trend)',
    inputs: { period: { min: 2 } },
    plots: [{ key: 'value', title: 'Trend', color: 0 }],
    levels: [0],
    scale: { min: -1, max: 1 },
  };

  protected read(config: IndicatorConfig): number {
    return getIntParam(config, 'period', 14, 2);
  }

  protected pointAt(data: DataSeries, i: number, period: number): IndicatorValue | null {
    const fit = regressionAt(data, i, period);
    return fit ? { value: fit.r } : null;
  }
}
