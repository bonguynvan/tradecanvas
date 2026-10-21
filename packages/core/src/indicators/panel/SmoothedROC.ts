import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { closes, emaOf, outputOf, pointsOf, type Num } from '../math.js';

/**
 * Smoothed Rate of Change: the percent change of an EMA of the close over
 * `roc` bars, (EMA − EMA `roc` bars ago) / EMA `roc` bars ago × 100. A rate of
 * change with less noise; its turns and zero crossings mark the trend's.
 */
export class SmoothedROCIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'sroc',
    name: 'Smoothed Rate of Change',
    placement: 'panel',
    defaultConfig: { ema: 13, roc: 21 },
    shortName: 'S-ROC',
    plots: [{ key: 'value', title: 'S-ROC', color: 0 }],
    levels: [0],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const ema = emaOf(closes(data), getIntParam(config, 'ema', 13, 1));
    const roc = getIntParam(config, 'roc', 21, 1);
    const out: Num[] = ema.map((v, i) => {
      const before = i >= roc ? ema[i - roc] : undefined;
      return v !== undefined && before !== undefined && before !== 0 ? ((v - before) / Math.abs(before)) * 100 : undefined;
    });
    return outputOf(data, pointsOf(out));
  }
}
