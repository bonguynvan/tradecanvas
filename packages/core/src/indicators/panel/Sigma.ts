import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorValue } from '@tradecanvas/commons';
import { PointwiseIndicator } from '../PointwiseIndicator.js';
import { getIntParam } from '../params.js';
import { closeStatsAt } from '../math.js';

/**
 * Sigma: how many standard deviations the close is from its `period`-bar
 * average, (close − SMA) / standard deviation. Past ±2 the close is
 * stretched, as at a Bollinger band. 0 when the closes don't vary.
 */
export class SigmaIndicator extends PointwiseIndicator<number> {
  descriptor: IndicatorDescriptor = {
    id: 'sigma',
    name: 'Sigma',
    placement: 'panel',
    defaultConfig: { period: 20 },
    shortName: 'Sigma',
    plots: [{ key: 'value', title: 'Sigma', color: 0 }],
    levels: [-2, 0, 2],
  };

  protected read(config: IndicatorConfig): number {
    return getIntParam(config, 'period', 20, 2);
  }

  protected pointAt(data: DataSeries, i: number, period: number): IndicatorValue | null {
    const stats = closeStatsAt(data, i, period);
    if (!stats) return null;
    // Rounding leaves a tiny spread on equal closes: below a billionth of the price, call it none.
    const flat = stats.sd <= Math.abs(stats.mean) * 1e-9;
    return { value: flat ? 0 : (data[i].close - stats.mean) / stats.sd };
  }
}
