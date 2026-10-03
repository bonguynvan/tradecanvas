import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorValue } from '@tradecanvas/commons';
import { PointwiseIndicator } from '../PointwiseIndicator.js';
import { getIntParam } from '../params.js';
import { regressionAt } from '../math.js';

/** Linear Regression Slope: the rise per bar of the least-squares line through the last `period` closes. */
export class LinearRegressionSlopeIndicator extends PointwiseIndicator<number> {
  descriptor: IndicatorDescriptor = {
    id: 'lrslope',
    name: 'Linear Regression Slope',
    placement: 'panel',
    defaultConfig: { period: 14 },
    shortName: 'LR Slope',
    inputs: { period: { min: 2 } },
    plots: [{ key: 'value', title: 'Slope', color: 0 }],
    levels: [0],
  };

  protected read(config: IndicatorConfig): number {
    return getIntParam(config, 'period', 14, 2);
  }

  protected pointAt(data: DataSeries, i: number, period: number): IndicatorValue | null {
    const fit = regressionAt(data, i, period);
    return fit ? { value: fit.slope } : null;
  }
}
