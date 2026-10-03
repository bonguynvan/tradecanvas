import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorValue } from '@tradecanvas/commons';
import { PointwiseIndicator } from '../PointwiseIndicator.js';
import { getIntParam } from '../params.js';
import { regressionAt } from '../math.js';

/** Standard Error: how far the last `period` closes stray from their least-squares line. */
export class StandardErrorIndicator extends PointwiseIndicator<number> {
  descriptor: IndicatorDescriptor = {
    id: 'stderror',
    name: 'Standard Error',
    placement: 'panel',
    defaultConfig: { period: 14 },
    shortName: 'StdErr',
    inputs: { period: { min: 3 } },
    plots: [{ key: 'value', title: 'StdErr', color: 0 }],
    scale: { min: 0 },
  };

  protected read(config: IndicatorConfig): number {
    return getIntParam(config, 'period', 14, 3);
  }

  protected pointAt(data: DataSeries, i: number, period: number): IndicatorValue | null {
    const fit = regressionAt(data, i, period);
    return fit ? { value: fit.stdErr } : null;
  }
}
