import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';

export class SMAIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'sma',
    name: 'Simple Moving Average',
    placement: 'overlay' as const,
    defaultConfig: { period: 20, source: 'close' },
    shortName: 'SMA',
    inputs: { source: { source: true }, period: { kind: 'int', min: 1 } },
    plots: [{ key: 'value', title: 'SMA', color: 0 }],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 20, 1);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i].close;
      if (i >= period) sum -= data[i - period].close;
      if (i >= period - 1) {
        const val: IndicatorValue = { value: sum / period };
        values.set(data[i].time, val);
        series[i] = val;
      }
    }
    return { values, series };
  }

  update(data: DataSeries, config: IndicatorConfig, prev: IndicatorOutput, from: number): IndicatorOutput | null {
    if (!this.canResume(data, prev, from)) return null;
    const period = getIntParam(config, 'period', 20, 1);
    for (let i = from; i < data.length; i++) {
      if (i < period - 1) { this.writePoint(prev, data, i, null); continue; }
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += data[j].close;
      this.writePoint(prev, data, i, { value: sum / period });
    }
    return prev;
  }
}
