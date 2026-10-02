import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { closes, outputOf, pointsOf, rmaOf } from '../math.js';

/**
 * Smoothed Moving Average (Wilder's RMA): starts as a simple average, then
 * moves a 1/period share towards each new close. The smoothing inside RSI
 * and ATR.
 */
export class SMMAIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'smma',
    name: 'Smoothed Moving Average',
    placement: 'overlay',
    defaultConfig: { period: 14, source: 'close' },
    shortName: 'SMMA',
    inputs: { period: { min: 1 }, source: { source: true } },
    plots: [{ key: 'value', title: 'SMMA', color: 0 }],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    return outputOf(data, pointsOf(rmaOf(closes(data), getIntParam(config, 'period', 14, 1))));
  }
}
