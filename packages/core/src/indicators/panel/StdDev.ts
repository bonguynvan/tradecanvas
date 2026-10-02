import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';

export class StdDevIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'stddev',
    name: 'Standard Deviation',
    placement: 'panel' as const,
    defaultConfig: { period: 20 },
    shortName: 'StdDev',
    plots: [{ key: 'value', title: 'StdDev', color: 0 }],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 20, 1);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);

    for (let i = period - 1; i < data.length; i++) {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += data[j].close;
      const mean = sum / period;
      let variance = 0;
      for (let j = i - period + 1; j <= i; j++) {
        const d = data[j].close - mean;
        variance += d * d;
      }
      const val: IndicatorValue = { value: Math.sqrt(variance / period) };
      values.set(data[i].time, val);
      series[i] = val;
    }
    return { values, series };
  }
}
