import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorValue } from '@tradecanvas/commons';
import { PointwiseIndicator } from '../PointwiseIndicator.js';
import { getIntParam } from '../params.js';

/** The longest window: its weights are made on each computation. */
const MAX_PERIOD = 500;

interface HammingParams {
  weights: number[];
  total: number;
}

/**
 * Hamming Moving Average: the closes of the last `period` bars weighted by a
 * Hamming window (0.54 − 0.46·cos(2πk / (period − 1))), most in the middle of
 * the window and evenly either side, then divided by the weights' sum. Smoother
 * than a simple average, with a lag of half the window.
 */
export class HammingMAIndicator extends PointwiseIndicator<HammingParams> {
  descriptor: IndicatorDescriptor = {
    id: 'hamming',
    name: 'Moving Average Hamming',
    placement: 'overlay',
    defaultConfig: { period: 10, source: 'close' },
    shortName: 'HMA (Hamming)',
    inputs: { period: { min: 2, max: MAX_PERIOD }, source: { source: true } },
    plots: [{ key: 'value', title: 'MA', color: 0 }],
  };

  protected read(config: IndicatorConfig): HammingParams {
    const period = Math.min(MAX_PERIOD, getIntParam(config, 'period', 10, 2));
    const weights = Array.from({ length: period }, (_, k) => 0.54 - 0.46 * Math.cos((2 * Math.PI * k) / (period - 1)));
    return { weights, total: weights.reduce((a, b) => a + b, 0) };
  }

  protected pointAt(data: DataSeries, i: number, { weights, total }: HammingParams): IndicatorValue | null {
    const start = i - weights.length + 1;
    if (start < 0) return null;
    let sum = 0;
    for (let k = 0; k < weights.length; k++) sum += weights[k] * data[start + k].close;
    return { value: sum / total };
  }
}
