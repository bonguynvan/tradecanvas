import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';

export class EMAIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'ema',
    name: 'Exponential Moving Average',
    placement: 'overlay' as const,
    defaultConfig: { period: 20, source: 'close' },
    shortName: 'EMA',
    inputs: { source: { source: true }, period: { kind: 'int', min: 1 } },
    plots: [{ key: 'value', title: 'EMA', color: 0 }],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 20, 1);
    const multiplier = 2 / (period + 1);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);

    let ema = 0;
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        ema += data[i].close;
        continue;
      }
      if (i === period - 1) {
        ema = (ema + data[i].close) / period;
      } else {
        ema = (data[i].close - ema) * multiplier + ema;
      }
      const val: IndicatorValue = { value: ema };
      values.set(data[i].time, val);
      series[i] = val;
    }
    return { values, series };
  }

  update(data: DataSeries, config: IndicatorConfig, prev: IndicatorOutput, from: number): IndicatorOutput | null {
    const period = getIntParam(config, 'period', 20, 1);
    // Resume needs a post-seed EMA at from-1; inside the warm-up, recompute.
    if (from < period || !this.canResume(data, prev, from)) return null;
    let ema = prev.series![from - 1]?.value;
    if (ema === undefined) return null;
    const multiplier = 2 / (period + 1);
    for (let i = from; i < data.length; i++) {
      ema = (data[i].close - ema) * multiplier + ema;
      this.writePoint(prev, data, i, { value: ema });
    }
    return prev;
  }
}
