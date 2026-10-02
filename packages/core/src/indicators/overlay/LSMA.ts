import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { outputOf, pointsOf, type Num } from '../math.js';

/**
 * Least Squares Moving Average: the end point of the straight line that best
 * fits the last `period` closes, shifted `offset` bars back along it.
 */
export class LSMAIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'lsma',
    name: 'Least Squares Moving Average',
    placement: 'overlay',
    defaultConfig: { period: 25, offset: 0, source: 'close' },
    shortName: 'LSMA',
    inputs: { period: { min: 2 }, offset: { step: 1 }, source: { source: true } },
    plots: [{ key: 'value', title: 'LSMA', color: 0 }],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 25, 2);
    const offset = Math.round(getIntParam(config, 'offset', 0, -1000));
    const sx = (period * (period - 1)) / 2;
    const sxx = ((period - 1) * period * (2 * period - 1)) / 6;
    const denom = period * sxx - sx * sx;
    const out: Num[] = new Array(data.length).fill(undefined);
    for (let i = period - 1; i < data.length; i++) {
      let sy = 0;
      let sxy = 0;
      for (let x = 0; x < period; x++) {
        const y = data[i - period + 1 + x].close;
        sy += y;
        sxy += x * y;
      }
      const slope = (period * sxy - sx * sy) / denom;
      const intercept = (sy - slope * sx) / period;
      out[i] = intercept + slope * (period - 1 - offset);
    }
    return outputOf(data, pointsOf(out));
  }
}
