import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';

/** Volume Weighted Moving Average — close price weighted by volume over the period. */
export class VWMAIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'vwma',
    name: 'Volume Weighted Moving Average',
    placement: 'overlay' as const,
    defaultConfig: { period: 20, source: 'close' },
    shortName: 'VWMA',
    inputs: { source: { source: true }, period: { kind: 'int', min: 1 } },
    plots: [{ key: 'value', title: 'VWMA', color: 0 }],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 20, 1);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);

    let pvSum = 0;
    let volSum = 0;
    for (let i = 0; i < data.length; i++) {
      const pv = data[i].close * data[i].volume;
      pvSum += pv;
      volSum += data[i].volume;

      if (i >= period) {
        const old = data[i - period];
        pvSum -= old.close * old.volume;
        volSum -= old.volume;
      }

      if (i >= period - 1 && volSum > 0) {
        const val: IndicatorValue = { value: pvSum / volSum };
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
      let pvSum = 0;
      let volSum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        pvSum += data[j].close * data[j].volume;
        volSum += data[j].volume;
      }
      this.writePoint(prev, data, i, volSum > 0 ? { value: pvSum / volSum } : null);
    }
    return prev;
  }
}
