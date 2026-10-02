import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorValue } from '@tradecanvas/commons';
import { PointwiseIndicator } from '../PointwiseIndicator.js';
import { getIntParam } from '../params.js';

interface Params { period: number; offset: number; sx: number; denom: number }

/**
 * Least Squares Moving Average: the end point of the straight line that best
 * fits the last `period` closes, shifted `offset` bars back along it.
 */
export class LSMAIndicator extends PointwiseIndicator<Params> {
  descriptor: IndicatorDescriptor = {
    id: 'lsma',
    name: 'Least Squares Moving Average',
    placement: 'overlay',
    defaultConfig: { period: 25, offset: 0, source: 'close' },
    shortName: 'LSMA',
    inputs: { period: { min: 2, max: 5000 }, offset: { step: 1 }, source: { source: true } },
    plots: [{ key: 'value', title: 'LSMA', color: 0 }],
  };

  protected read(config: IndicatorConfig): Params {
    const period = Math.min(5000, getIntParam(config, 'period', 25, 2));
    const offset = Math.round(getIntParam(config, 'offset', 0, -1000));
    const sx = (period * (period - 1)) / 2;
    const sxx = ((period - 1) * period * (2 * period - 1)) / 6;
    return { period, offset, sx, denom: period * sxx - sx * sx };
  }

  protected pointAt(data: DataSeries, i: number, { period, offset, sx, denom }: Params): IndicatorValue | null {
    if (i < period - 1) return null;
    let sy = 0;
    let sxy = 0;
    for (let x = 0; x < period; x++) {
      const y = data[i - period + 1 + x].close;
      sy += y;
      sxy += x * y;
    }
    const slope = (period * sxy - sx * sy) / denom;
    const intercept = (sy - slope * sx) / period;
    return { value: intercept + slope * (period - 1 - offset) };
  }
}
