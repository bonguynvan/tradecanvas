import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { outputOf, pointsOf, type Num } from '../math.js';

/** Momentum: the close minus the close `period` bars ago. */
export class MomentumIndicator extends IndicatorBase {
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

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 10, 1);
    const out: Num[] = data.map((bar, i) => (i >= period ? bar.close - data[i - period].close : undefined));
    return outputOf(data, pointsOf(out));
  }
}
