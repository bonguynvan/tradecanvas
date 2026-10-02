import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';

export class AwesomeOscillatorIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'ao',
    name: 'Awesome Oscillator',
    placement: 'panel' as const,
    defaultConfig: { fast: 5, slow: 34 },
    shortName: 'AO',
    plots: [{ key: 'value', title: 'AO', color: 0, kind: 'histogram', tone: { field: 'up' }, downColor: 1 }],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const fast = getIntParam(config, 'fast', 5, 1);
    const slow = getIntParam(config, 'slow', 34, 1);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    if (data.length < slow) return { values, series };

    const median: number[] = new Array(data.length);
    for (let i = 0; i < data.length; i++) {
      median[i] = (data[i].high + data[i].low) / 2;
    }

    let fastSum = 0;
    let slowSum = 0;
    let prevAo: number | undefined;
    for (let i = 0; i < data.length; i++) {
      slowSum += median[i];
      if (i >= slow) slowSum -= median[i - slow];
      fastSum += median[i];
      if (i >= fast) fastSum -= median[i - fast];

      if (i >= slow - 1) {
        const ao = fastSum / fast - slowSum / slow;
        const up = prevAo === undefined ? true : ao >= prevAo;
        const val: IndicatorValue = { value: ao, up: up ? 1 : 0 };
        values.set(data[i].time, val);
        series[i] = val;
        prevAo = ao;
      }
    }
    return { values, series };
  }
}
