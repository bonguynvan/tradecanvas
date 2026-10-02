import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';

export class OBVIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'obv',
    name: 'On Balance Volume',
    placement: 'panel' as const,
    defaultConfig: {},
    shortName: 'OBV',
    plots: [{ key: 'value', title: 'OBV', color: 0 }],
  };

  calculate(data: DataSeries, _config: IndicatorConfig): IndicatorOutput {
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    if (data.length === 0) return { values, series };

    let obv = 0;
    const val0: IndicatorValue = { value: obv };
    values.set(data[0].time, val0);
    series[0] = val0;

    for (let i = 1; i < data.length; i++) {
      if (data[i].close > data[i - 1].close) obv += data[i].volume;
      else if (data[i].close < data[i - 1].close) obv -= data[i].volume;
      const val: IndicatorValue = { value: obv };
      values.set(data[i].time, val);
      series[i] = val;
    }
    return { values, series };
  }

  update(data: DataSeries, _config: IndicatorConfig, prev: IndicatorOutput, from: number): IndicatorOutput | null {
    if (!this.canResume(data, prev, from)) return null;
    let obv = prev.series![from - 1]?.value;
    if (obv === undefined) return null;
    for (let i = from; i < data.length; i++) {
      if (data[i].close > data[i - 1].close) obv += data[i].volume;
      else if (data[i].close < data[i - 1].close) obv -= data[i].volume;
      this.writePoint(prev, data, i, { value: obv });
    }
    return prev;
  }
}
