import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';

export class AroonIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'aroon',
    name: 'Aroon',
    placement: 'panel' as const,
    defaultConfig: { period: 25 },
    shortName: 'Aroon',
    plots: [
      { key: 'up', title: 'Up', color: 0 },
      { key: 'down', title: 'Down', color: 1 },
    ],
    scale: { min: 0, max: 100 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 25, 1);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);

    for (let i = period; i < data.length; i++) {
      let highIdx = 0, lowIdx = 0;
      let high = -Infinity, low = Infinity;
      for (let j = 0; j <= period; j++) {
        const k = i - period + j;
        if (data[k].high > high) { high = data[k].high; highIdx = j; }
        if (data[k].low < low) { low = data[k].low; lowIdx = j; }
      }
      const val: IndicatorValue = {
        up: (highIdx / period) * 100,
        down: (lowIdx / period) * 100,
      };
      values.set(data[i].time, val);
      series[i] = val;
    }
    return { values, series };
  }
}
