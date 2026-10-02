import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';

export class CMFIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'cmf',
    name: 'Chaikin Money Flow',
    placement: 'panel' as const,
    defaultConfig: { period: 20 },
    shortName: 'CMF',
    plots: [{ key: 'value', title: 'CMF', color: 0, kind: 'histogram', tone: 'sign', downColor: 1 }],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 20, 1);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);

    for (let i = period - 1; i < data.length; i++) {
      let mfvSum = 0, volSum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        const hl = data[j].high - data[j].low;
        const mfm = hl === 0 ? 0 : ((data[j].close - data[j].low) - (data[j].high - data[j].close)) / hl;
        mfvSum += mfm * data[j].volume;
        volSum += data[j].volume;
      }
      const val: IndicatorValue = { value: volSum === 0 ? 0 : mfvSum / volSum };
      values.set(data[i].time, val);
      series[i] = val;
    }
    return { values, series };
  }
}
