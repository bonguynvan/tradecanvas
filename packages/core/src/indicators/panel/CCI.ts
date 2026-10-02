import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';

export class CCIIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'cci',
    name: 'Commodity Channel Index',
    placement: 'panel' as const,
    defaultConfig: { period: 20 },
    shortName: 'CCI',
    plots: [{ key: 'value', title: 'CCI', color: 0 }],
    levels: [-100, 0, 100],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 20, 1);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);

    for (let i = period - 1; i < data.length; i++) {
      let sumTP = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sumTP += (data[j].high + data[j].low + data[j].close) / 3;
      }
      const meanTP = sumTP / period;
      let sumDev = 0;
      for (let j = i - period + 1; j <= i; j++) {
        const tp = (data[j].high + data[j].low + data[j].close) / 3;
        sumDev += Math.abs(tp - meanTP);
      }
      const meanDev = sumDev / period;
      const tp = (data[i].high + data[i].low + data[i].close) / 3;
      const cci = meanDev === 0 ? 0 : (tp - meanTP) / (0.015 * meanDev);
      const val: IndicatorValue = { value: cci };
      values.set(data[i].time, val);
      series[i] = val;
    }
    return { values, series };
  }
}
