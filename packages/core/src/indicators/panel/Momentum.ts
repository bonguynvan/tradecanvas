import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorValue } from '@tradecanvas/commons';
import { PointwiseIndicator } from '../PointwiseIndicator.js';
import { getIntParam } from '../params.js';

/** Momentum: the close minus the close `period` bars ago. */
export class MomentumIndicator extends PointwiseIndicator<number> {
  descriptor: IndicatorDescriptor = {
    id: 'mom',
    name: 'Momentum',
    placement: 'panel',
    defaultConfig: { period: 10, source: 'close' },
    shortName: 'MOM',
    inputs: { period: { min: 1 }, source: { source: true } },
    plots: [{ key: 'value', title: 'MOM', color: 0 }],
    levels: [0],
  };

  protected read(config: IndicatorConfig): number {
    return getIntParam(config, 'period', 10, 1);
  }

  protected pointAt(data: DataSeries, i: number, period: number): IndicatorValue | null {
    return i >= period ? { value: data[i].close - data[i - period].close } : null;
  }
}
