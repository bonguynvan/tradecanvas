import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';

export class ROCIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'roc',
    name: 'Rate of Change',
    placement: 'panel' as const,
    defaultConfig: { period: 12 },
    shortName: 'ROC',
    plots: [{ key: 'value', title: 'ROC', color: 0 }],
    levels: [0],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 12, 1);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);

    for (let i = period; i < data.length; i++) {
      const prev = data[i - period].close;
      const roc = prev === 0 ? 0 : ((data[i].close - prev) / prev) * 100;
      const val: IndicatorValue = { value: roc };
      values.set(data[i].time, val);
      series[i] = val;
    }
    return { values, series };
  }
}
