import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam, getNumberParam } from '../params.js';

/**
 * Linear Regression Channel — fits a least-squares line over the trailing `period` closes
 * and offsets it by `stdDev` standard deviations of residuals to form upper/lower bands.
 */
export class LinearRegressionChannelIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'lrc',
    name: 'Linear Regression Channel',
    placement: 'overlay' as const,
    defaultConfig: { period: 100, stdDev: 2, source: 'close' },
    shortName: 'LRC',
    inputs: { source: { source: true }, period: { kind: 'int', min: 2 }, stdDev: { kind: 'number', min: 0.1, step: 0.1 } },
    fills: [{ between: ['upper', 'lower'], color: 0, opacity: 0.08 }],
    plots: [
      { key: 'upper', title: 'Upper', color: 0 },
      { key: 'middle', title: 'Basis', color: 1 },
      { key: 'lower', title: 'Lower', color: 0 },
    ],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 100, 2);
    const dev = getNumberParam(config, 'stdDev', 2);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);

    if (data.length < period) return { values, series };

    for (let i = period - 1; i < data.length; i++) {
      const start = i - period + 1;
      let sumX = 0;
      let sumY = 0;
      let sumXY = 0;
      let sumXX = 0;
      for (let k = 0; k < period; k++) {
        const x = k;
        const y = data[start + k].close;
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumXX += x * x;
      }
      const denom = period * sumXX - sumX * sumX;
      if (denom === 0) continue;
      const slope = (period * sumXY - sumX * sumY) / denom;
      const intercept = (sumY - slope * sumX) / period;

      let sse = 0;
      for (let k = 0; k < period; k++) {
        const fitted = slope * k + intercept;
        const resid = data[start + k].close - fitted;
        sse += resid * resid;
      }
      const sd = Math.sqrt(sse / period);
      const mid = slope * (period - 1) + intercept;
      const val: IndicatorValue = {
        middle: mid,
        upper: mid + dev * sd,
        lower: mid - dev * sd,
        slope,
      };
      values.set(data[i].time, val);
      series[i] = val;
    }
    return { values, series };
  }
}
