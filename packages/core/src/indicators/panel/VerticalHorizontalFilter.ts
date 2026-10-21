import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorValue } from '@tradecanvas/commons';
import { PointwiseIndicator } from '../PointwiseIndicator.js';
import { getIntParam } from '../params.js';

/**
 * Vertical Horizontal Filter: whether prices trend or range. Over `period`
 * changes, (highest close − lowest close) / the sum of the closes' absolute
 * changes. Near 1 the closes went one way; low values mean back and forth.
 */
export class VerticalHorizontalFilterIndicator extends PointwiseIndicator<number> {
  descriptor: IndicatorDescriptor = {
    id: 'vhf',
    name: 'Vertical Horizontal Filter',
    placement: 'panel',
    defaultConfig: { period: 28 },
    shortName: 'VHF',
    plots: [{ key: 'value', title: 'VHF', color: 0 }],
  };

  protected read(config: IndicatorConfig): number {
    return getIntParam(config, 'period', 28, 1);
  }

  protected pointAt(data: DataSeries, i: number, period: number): IndicatorValue | null {
    if (i < period) return null;
    // The highs and lows include the close the first change starts from.
    let hi = data[i - period].close;
    let lo = hi;
    let path = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const c = data[j].close;
      if (c > hi) hi = c;
      if (c < lo) lo = c;
      path += Math.abs(c - data[j - 1].close);
    }
    return path > 0 ? { value: (hi - lo) / path } : null;
  }
}
