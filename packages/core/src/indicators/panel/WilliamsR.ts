import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';

export class WilliamsRIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'williamsR',
    name: 'Williams %R',
    placement: 'panel' as const,
    defaultConfig: { period: 14 },
    shortName: '%R',
    plots: [{ key: 'value', title: '%R', color: 0 }],
    scale: { min: -100, max: 0 },
    levels: [-80, -20],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 14, 1);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);

    for (let i = period - 1; i < data.length; i++) {
      let highestHigh = -Infinity;
      let lowestLow = Infinity;
      for (let j = i - period + 1; j <= i; j++) {
        if (data[j].high > highestHigh) highestHigh = data[j].high;
        if (data[j].low < lowestLow) lowestLow = data[j].low;
      }
      const wr = highestHigh === lowestLow ? -50 : ((highestHigh - data[i].close) / (highestHigh - lowestLow)) * -100;
      const val: IndicatorValue = { value: wr };
      values.set(data[i].time, val);
      series[i] = val;
    }
    return { values, series };
  }
}
