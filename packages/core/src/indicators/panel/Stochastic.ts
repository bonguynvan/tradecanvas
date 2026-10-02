import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';

export class StochasticIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'stochastic',
    name: 'Stochastic Oscillator',
    placement: 'panel' as const,
    defaultConfig: { kPeriod: 14, dPeriod: 3, smooth: 3 },
    shortName: 'Stoch',
    plots: [
      { key: 'k', title: '%K', color: 0 },
      { key: 'd', title: '%D', color: 1 },
    ],
    scale: { min: 0, max: 100 },
    levels: [20, 80],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const kPeriod = getIntParam(config, 'kPeriod', 14, 1);
    const dPeriod = getIntParam(config, 'dPeriod', 3, 1);
    const smooth = getIntParam(config, 'smooth', 3, 1);
    const values = new IndicatorValueMap();

    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);

    if (data.length < kPeriod) return { values, series };

    // Raw %K
    const rawK: number[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i < kPeriod - 1) { rawK.push(0); continue; }
      let high = -Infinity;
      let low = Infinity;
      for (let j = i - kPeriod + 1; j <= i; j++) {
        if (data[j].high > high) high = data[j].high;
        if (data[j].low < low) low = data[j].low;
      }
      rawK.push(high === low ? 50 : ((data[i].close - low) / (high - low)) * 100);
    }

    // Smoothed %K (SMA of raw %K)
    const kValues: number[] = [];
    for (let i = 0; i < rawK.length; i++) {
      if (i < kPeriod - 1 + smooth - 1) { kValues.push(0); continue; }
      let sum = 0;
      for (let j = i - smooth + 1; j <= i; j++) sum += rawK[j];
      kValues.push(sum / smooth);
    }

    // %D (SMA of %K)
    const startIdx = kPeriod - 1 + smooth - 1;
    for (let i = startIdx; i < kValues.length; i++) {
      const val: IndicatorValue = { k: kValues[i] };
      if (i >= startIdx + dPeriod - 1) {
        let sum = 0;
        for (let j = i - dPeriod + 1; j <= i; j++) sum += kValues[j];
        val.d = sum / dPeriod;
      }
      values.set(data[i].time, val);
      series[i] = val;
    }
    return { values, series };
  }

  update(data: DataSeries, config: IndicatorConfig, prev: IndicatorOutput, from: number): IndicatorOutput | null {
    if (!this.canResume(data, prev, from)) return null;
    const kPeriod = getIntParam(config, 'kPeriod', 14, 1);
    const dPeriod = getIntParam(config, 'dPeriod', 3, 1);
    const smooth = getIntParam(config, 'smooth', 3, 1);
    const startIdx = kPeriod - 1 + smooth - 1;

    // Same formulas as calculate(), evaluated only for the windows the
    // changed bars feed into — O(dPeriod * smooth * kPeriod) per bar.
    const rawK = (j: number): number => {
      let high = -Infinity;
      let low = Infinity;
      for (let m = j - kPeriod + 1; m <= j; m++) {
        if (data[m].high > high) high = data[m].high;
        if (data[m].low < low) low = data[m].low;
      }
      return high === low ? 50 : ((data[j].close - low) / (high - low)) * 100;
    };
    const kAt = (j: number): number => {
      let sum = 0;
      for (let m = j - smooth + 1; m <= j; m++) sum += rawK(m);
      return sum / smooth;
    };

    for (let i = from; i < data.length; i++) {
      if (i < startIdx || data.length < kPeriod) { this.writePoint(prev, data, i, null); continue; }
      const val: IndicatorValue = { k: kAt(i) };
      if (i >= startIdx + dPeriod - 1) {
        let sum = 0;
        for (let j = i - dPeriod + 1; j <= i; j++) sum += kAt(j);
        val.d = sum / dPeriod;
      }
      this.writePoint(prev, data, i, val);
    }
    return prev;
  }
}
