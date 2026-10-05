import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorValue } from '@tradecanvas/commons';
import { PointwiseIndicator } from '../PointwiseIndicator.js';
import { getIntParam } from '../params.js';

/** Majority Rule: the share of the last `period` closes above the close before, in percent. */
export class MajorityRuleIndicator extends PointwiseIndicator<{ period: number }> {
  descriptor: IndicatorDescriptor = {
    id: 'majority',
    name: 'Majority Rule',
    placement: 'panel',
    defaultConfig: { period: 14 },
    shortName: 'Majority',
    inputs: { period: { min: 1 } },
    plots: [{ key: 'value', title: 'Majority', color: 0 }],
    scale: { min: 0, max: 100 },
    levels: [50],
  };

  protected read(config: IndicatorConfig) {
    return { period: getIntParam(config, 'period', 14, 1) };
  }

  protected pointAt(data: DataSeries, i: number, { period }: { period: number }): IndicatorValue | null {
    if (i < period) return null;
    let up = 0;
    for (let j = i - period + 1; j <= i; j++) if (data[j].close > data[j - 1].close) up++;
    return { value: (100 * up) / period };
  }
}
