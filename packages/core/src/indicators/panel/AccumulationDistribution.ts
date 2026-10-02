import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';

export class AccumulationDistributionIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'ad',
    name: 'Accumulation/Distribution',
    placement: 'panel' as const,
    defaultConfig: {},
    shortName: 'A/D',
    plots: [{ key: 'value', title: 'A/D', color: 0 }],
  };

  calculate(data: DataSeries, _config: IndicatorConfig): IndicatorOutput {
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    if (data.length === 0) return { values, series };

    let ad = 0;
    for (let i = 0; i < data.length; i++) {
      const hl = data[i].high - data[i].low;
      const mfm = hl === 0 ? 0 : ((data[i].close - data[i].low) - (data[i].high - data[i].close)) / hl;
      ad += mfm * data[i].volume;
      const val: IndicatorValue = { value: ad };
      values.set(data[i].time, val);
      series[i] = val;
    }
    return { values, series };
  }
}
