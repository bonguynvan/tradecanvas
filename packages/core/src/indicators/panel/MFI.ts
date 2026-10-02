import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';

export class MFIIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'mfi',
    name: 'Money Flow Index',
    placement: 'panel' as const,
    defaultConfig: { period: 14 },
    shortName: 'MFI',
    plots: [{ key: 'value', title: 'MFI', color: 0 }],
    scale: { min: 0, max: 100 },
    levels: [20, 80],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 14, 1);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    if (data.length < period + 1) return { values, series };

    const typicalPrices = data.map((b) => (b.high + b.low + b.close) / 3);
    const rawMF = typicalPrices.map((tp, i) => tp * data[i].volume);

    for (let i = period; i < data.length; i++) {
      let posFlow = 0, negFlow = 0;
      for (let j = i - period + 1; j <= i; j++) {
        if (typicalPrices[j] > typicalPrices[j - 1]) posFlow += rawMF[j];
        else if (typicalPrices[j] < typicalPrices[j - 1]) negFlow += rawMF[j];
      }
      const mfi = negFlow === 0 ? 100 : 100 - 100 / (1 + posFlow / negFlow);
      const val: IndicatorValue = { value: mfi };
      values.set(data[i].time, val);
      series[i] = val;
    }
    return { values, series };
  }
}
