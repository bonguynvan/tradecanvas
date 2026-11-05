import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';

export class DonchianChannelIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'donchian',
    name: 'Donchian Channel',
    placement: 'overlay' as const,
    defaultConfig: { period: 20 },
    inputs: { period: { kind: 'int', min: 1 } },
    shortName: 'DC',
    fills: [{ between: ['upper', 'lower'], color: 0, opacity: 0.08 }],
    plots: [
      { key: 'upper', title: 'Upper', color: 0 },
      { key: 'middle', title: 'Basis', color: 1, width: 1 },
      { key: 'lower', title: 'Lower', color: 0 },
    ],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 20, 1);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);

    for (let i = period - 1; i < data.length; i++) {
      let high = -Infinity, low = Infinity;
      for (let j = i - period + 1; j <= i; j++) {
        if (data[j].high > high) high = data[j].high;
        if (data[j].low < low) low = data[j].low;
      }
      const val: IndicatorValue = {
        upper: high,
        middle: (high + low) / 2,
        lower: low,
      };
      values.set(data[i].time, val);
      series[i] = val;
    }
    return { values, series };
  }
}
