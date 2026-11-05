import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam, getNumberParam } from '../params.js';

export class KeltnerChannelIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'keltner',
    name: 'Keltner Channel',
    placement: 'overlay' as const,
    defaultConfig: { emaPeriod: 20, atrPeriod: 10, multiplier: 1.5 },
    inputs: { emaPeriod: { kind: 'int', min: 1 }, atrPeriod: { kind: 'int', min: 1 }, multiplier: { kind: 'number', min: 0.1, step: 0.1 } },
    shortName: 'KC',
    fills: [{ between: ['upper', 'lower'], color: 0, opacity: 0.08 }],
    plots: [
      { key: 'upper', title: 'Upper', color: 0 },
      { key: 'middle', title: 'Basis', color: 1 },
      { key: 'lower', title: 'Lower', color: 0 },
    ],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const emaPeriod = getIntParam(config, 'emaPeriod', 20, 1);
    const atrPeriod = getIntParam(config, 'atrPeriod', 10, 1);
    const mult = getNumberParam(config, 'multiplier', 1.5);
    const values = new IndicatorValueMap();
    if (data.length < Math.max(emaPeriod, atrPeriod)) return { values };

    // EMA of close
    const emaMult = 2 / (emaPeriod + 1);
    let ema = data[0].close;
    const emaArr: number[] = [ema];
    for (let i = 1; i < data.length; i++) {
      ema = (data[i].close - ema) * emaMult + ema;
      emaArr.push(ema);
    }

    // ATR
    const trArr: number[] = [data[0].high - data[0].low];
    for (let i = 1; i < data.length; i++) {
      trArr.push(Math.max(
        data[i].high - data[i].low,
        Math.abs(data[i].high - data[i - 1].close),
        Math.abs(data[i].low - data[i - 1].close),
      ));
    }

    let atr = 0;
    for (let i = 0; i < atrPeriod; i++) atr += trArr[i];
    atr /= atrPeriod;

    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const start = Math.max(emaPeriod, atrPeriod) - 1;
    for (let i = start; i < data.length; i++) {
      if (i > start) {
        atr = (atr * (atrPeriod - 1) + trArr[i]) / atrPeriod;
      }
      const val: IndicatorValue = {
        middle: emaArr[i],
        upper: emaArr[i] + mult * atr,
        lower: emaArr[i] - mult * atr,
      };
      values.set(data[i].time, val);
      series[i] = val;
    }
    return { values, series };
  }
}
