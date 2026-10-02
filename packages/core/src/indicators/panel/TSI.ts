import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';

export class TSIIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'tsi',
    name: 'True Strength Index',
    placement: 'panel' as const,
    defaultConfig: { longPeriod: 25, shortPeriod: 13, signalPeriod: 7, source: 'close' },
    shortName: 'TSI',
    inputs: { source: { source: true } },
    plots: [
      { key: 'tsi', title: 'TSI', color: 0 },
      { key: 'signal', title: 'Signal', color: 1 },
    ],
    levels: [0],
  };

  private emaSmooth(values: number[], period: number): number[] {
    const mult = 2 / (period + 1);
    const result: number[] = [values[0]];
    for (let i = 1; i < values.length; i++) {
      result.push((values[i] - result[i - 1]) * mult + result[i - 1]);
    }
    return result;
  }

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const longP = getIntParam(config, 'longPeriod', 25, 1);
    const shortP = getIntParam(config, 'shortPeriod', 13, 1);
    const sigP = getIntParam(config, 'signalPeriod', 7, 1);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    if (data.length < 2) return { values, series };

    const momentum: number[] = [];
    const absMomentum: number[] = [];
    for (let i = 1; i < data.length; i++) {
      const m = data[i].close - data[i - 1].close;
      momentum.push(m);
      absMomentum.push(Math.abs(m));
    }

    const smoothMom = this.emaSmooth(this.emaSmooth(momentum, longP), shortP);
    const smoothAbsMom = this.emaSmooth(this.emaSmooth(absMomentum, longP), shortP);

    const tsiValues: number[] = [];
    for (let i = 0; i < smoothMom.length; i++) {
      tsiValues.push(smoothAbsMom[i] === 0 ? 0 : (smoothMom[i] / smoothAbsMom[i]) * 100);
    }

    const signalLine = this.emaSmooth(tsiValues, sigP);

    for (let i = 0; i < tsiValues.length; i++) {
      const dataIdx = i + 1;
      if (dataIdx < data.length) {
        const val: IndicatorValue = {
          tsi: tsiValues[i],
          signal: signalLine[i],
        };
        values.set(data[dataIdx].time, val);
        series[dataIdx] = val;
      }
    }
    return { values, series };
  }
}
