import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';

export class VROCIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'vroc',
    name: 'Volume Rate of Change',
    placement: 'panel' as const,
    defaultConfig: { period: 14 },
    shortName: 'VROC',
    plots: [{ key: 'value', title: 'VROC', color: 0 }],
    levels: [0],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 14, 1);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);

    for (let i = period; i < data.length; i++) {
      const prev = data[i - period].volume;
      const vroc = prev === 0 ? 0 : ((data[i].volume - prev) / prev) * 100;
      const val: IndicatorValue = { value: vroc };
      values.set(data[i].time, val);
      series[i] = val;
    }
    return { values, series };
  }
}
