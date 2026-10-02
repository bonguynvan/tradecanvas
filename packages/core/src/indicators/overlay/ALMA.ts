import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorValue } from '@tradecanvas/commons';
import { PointwiseIndicator } from '../PointwiseIndicator.js';
import { getIntParam, getNumberParam } from '../params.js';

interface Params { period: number; weights: number[]; norm: number }

/**
 * Arnaud Legoux Moving Average: a Gaussian-weighted average whose weight
 * peaks `offset` of the way from the oldest bar to the newest (0.85 leans
 * towards recent bars), `sigma` setting how sharp the peak is. Smooth with
 * little lag.
 */
export class ALMAIndicator extends PointwiseIndicator<Params> {
  descriptor: IndicatorDescriptor = {
    id: 'alma',
    name: 'Arnaud Legoux Moving Average',
    placement: 'overlay',
    defaultConfig: { period: 9, offset: 0.85, sigma: 6, source: 'close' },
    shortName: 'ALMA',
    inputs: {
      period: { min: 1, max: 5000 },
      offset: { min: 0, max: 1, step: 0.05 },
      sigma: { min: 0.5, step: 0.5 },
      source: { source: true },
    },
    plots: [{ key: 'value', title: 'ALMA', color: 0 }],
  };

  protected read(config: IndicatorConfig): Params {
    const period = Math.min(5000, getIntParam(config, 'period', 9, 1));
    const offset = Math.min(1, Math.max(0, getNumberParam(config, 'offset', 0.85)));
    const sigma = Math.max(0.5, getNumberParam(config, 'sigma', 6));
    const m = offset * (period - 1);
    const s = period / sigma;
    // Weight j applies to the j-th oldest bar of the window.
    const weights = Array.from({ length: period }, (_, j) => Math.exp(-((j - m) ** 2) / (2 * s * s)));
    return { period, weights, norm: weights.reduce((a, b) => a + b, 0) };
  }

  protected pointAt(data: DataSeries, i: number, { period, weights, norm }: Params): IndicatorValue | null {
    if (i < period - 1) return null;
    let sum = 0;
    for (let j = 0; j < period; j++) sum += weights[j] * data[i - period + 1 + j].close;
    return { value: sum / norm };
  }
}
