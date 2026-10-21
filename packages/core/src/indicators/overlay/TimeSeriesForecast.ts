import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorValue } from '@tradecanvas/commons';
import { PointwiseIndicator } from '../PointwiseIndicator.js';
import { getIntParam } from '../params.js';
import { regressionAt } from '../math.js';

/**
 * Time Series Forecast: the least-squares line through the last `period`
 * closes, carried one bar on: where the trend says the next close would be.
 */
export class TimeSeriesForecastIndicator extends PointwiseIndicator<number> {
  descriptor: IndicatorDescriptor = {
    id: 'tsf',
    name: 'Time Series Forecast',
    placement: 'overlay',
    defaultConfig: { period: 14 },
    shortName: 'TSF',
    plots: [{ key: 'value', title: 'TSF', color: 0 }],
  };

  protected read(config: IndicatorConfig): number {
    return getIntParam(config, 'period', 14, 2);
  }

  protected pointAt(data: DataSeries, i: number, period: number): IndicatorValue | null {
    const fit = regressionAt(data, i, period);
    return fit ? { value: fit.end + fit.slope } : null;
  }
}
