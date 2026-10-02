import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';

export class ATRIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'atr',
    name: 'Average True Range',
    placement: 'panel' as const,
    defaultConfig: { period: 14 },
    shortName: 'ATR',
    plots: [{ key: 'value', title: 'ATR', color: 0 }],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 14, 1);
    const values = new IndicatorValueMap();

    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);

    // Fewer bars than the period can't seed the average (and used to throw
    // reading data[period - 1]); emit an empty series like other indicators.
    if (data.length < Math.max(2, period)) return { values, series };

    const trueRanges: number[] = [data[0].high - data[0].low];
    for (let i = 1; i < data.length; i++) {
      const tr = Math.max(
        data[i].high - data[i].low,
        Math.abs(data[i].high - data[i - 1].close),
        Math.abs(data[i].low - data[i - 1].close),
      );
      trueRanges.push(tr);
    }

    let atr = 0;
    for (let i = 0; i < period; i++) atr += trueRanges[i];
    atr /= period;
    const val0: IndicatorValue = { value: atr };
    values.set(data[period - 1].time, val0);
    series[period - 1] = val0;

    for (let i = period; i < data.length; i++) {
      atr = (atr * (period - 1) + trueRanges[i]) / period;
      const val: IndicatorValue = { value: atr };
      values.set(data[i].time, val);
      series[i] = val;
    }
    return { values, series };
  }

  update(data: DataSeries, config: IndicatorConfig, prev: IndicatorOutput, from: number): IndicatorOutput | null {
    const period = getIntParam(config, 'period', 14, 1);
    // Wilder smoothing resumes from the ATR at from-1 (seeded at period-1).
    if (from < period || !this.canResume(data, prev, from)) return null;
    let atr = prev.series![from - 1]?.value;
    if (atr === undefined) return null;
    for (let i = from; i < data.length; i++) {
      const tr = Math.max(
        data[i].high - data[i].low,
        Math.abs(data[i].high - data[i - 1].close),
        Math.abs(data[i].low - data[i - 1].close),
      );
      atr = (atr * (period - 1) + tr) / period;
      this.writePoint(prev, data, i, { value: atr });
    }
    return prev;
  }
}
