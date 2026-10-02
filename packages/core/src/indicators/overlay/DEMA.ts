import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { closes, emaOf, outputOf, pointsOf } from '../math.js';

/** Double Exponential Moving Average (Mulloy): 2·EMA − EMA(EMA), with less lag than either. */
export class DEMAIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'dema',
    name: 'Double Exponential Moving Average',
    placement: 'overlay',
    defaultConfig: { period: 20, source: 'close' },
    shortName: 'DEMA',
    inputs: { period: { min: 1 }, source: { source: true } },
    plots: [{ key: 'value', title: 'DEMA', color: 0 }],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 20, 1);
    const e1 = emaOf(closes(data), period);
    const e2 = emaOf(e1, period);
    return outputOf(data, pointsOf(e1.map((v, i) => (v !== undefined && e2[i] !== undefined ? 2 * v - e2[i]! : undefined))));
  }
}
