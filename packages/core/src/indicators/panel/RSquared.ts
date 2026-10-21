import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorValue } from '@tradecanvas/commons';
import { PointwiseIndicator } from '../PointwiseIndicator.js';
import { getIntParam } from '../params.js';
import { regressionAt } from '../math.js';

/**
 * R-squared: how well a straight line fits the last `period` closes, from 0
 * (no fit) to 1 (the closes lie on a line). High values mark a steady trend,
 * whichever way it goes.
 */
export class RSquaredIndicator extends PointwiseIndicator<number> {
  descriptor: IndicatorDescriptor = {
    id: 'rsquared',
    name: 'R-Squared',
    placement: 'panel',
    defaultConfig: { period: 14 },
    shortName: 'R²',
    plots: [{ key: 'value', title: 'R²', color: 0 }],
    scale: { min: 0, max: 1 },
  };

  protected read(config: IndicatorConfig): number {
    return getIntParam(config, 'period', 14, 2);
  }

  protected pointAt(data: DataSeries, i: number, period: number): IndicatorValue | null {
    const fit = regressionAt(data, i, period);
    return fit ? { value: fit.r * fit.r } : null;
  }
}
