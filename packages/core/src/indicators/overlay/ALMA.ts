import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam, getNumberParam } from '../params.js';
import { outputOf, pointsOf, type Num } from '../math.js';

/**
 * Arnaud Legoux Moving Average: a Gaussian-weighted average whose weight
 * peaks `offset` of the way from the oldest bar to the newest (0.85 leans
 * towards recent bars), `sigma` setting how sharp the peak is. Smooth with
 * little lag.
 */
export class ALMAIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'alma',
    name: 'Arnaud Legoux Moving Average',
    placement: 'overlay',
    defaultConfig: { period: 9, offset: 0.85, sigma: 6, source: 'close' },
    shortName: 'ALMA',
    inputs: {
      period: { min: 1 },
      offset: { min: 0, max: 1, step: 0.05 },
      sigma: { min: 0.5, step: 0.5 },
      source: { source: true },
    },
    plots: [{ key: 'value', title: 'ALMA', color: 0 }],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 9, 1);
    const offset = Math.min(1, Math.max(0, getNumberParam(config, 'offset', 0.85)));
    const sigma = Math.max(0.5, getNumberParam(config, 'sigma', 6));
    const m = offset * (period - 1);
    const s = period / sigma;
    // Weight j applies to the j-th oldest bar of the window.
    const weights = Array.from({ length: period }, (_, j) => Math.exp(-((j - m) ** 2) / (2 * s * s)));
    const norm = weights.reduce((a, b) => a + b, 0);
    const out: Num[] = new Array(data.length).fill(undefined);
    for (let i = period - 1; i < data.length; i++) {
      let sum = 0;
      for (let j = 0; j < period; j++) sum += weights[j] * data[i - period + 1 + j].close;
      out[i] = sum / norm;
    }
    return outputOf(data, pointsOf(out));
  }
}
