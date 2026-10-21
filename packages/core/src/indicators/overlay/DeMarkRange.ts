import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorValue } from '@tradecanvas/commons';
import { PointwiseIndicator } from '../PointwiseIndicator.js';

/**
 * DeMark projected range: the high and low the previous bar points to for
 * this one. From the previous bar, X = 2·high + low + close when it closed up,
 * high + 2·low + close when it closed down, high + low + 2·close when flat;
 * the projected high is X/2 − its low, the projected low X/2 − its high.
 */
export class DeMarkRangeIndicator extends PointwiseIndicator<null> {
  descriptor: IndicatorDescriptor = {
    id: 'demark',
    name: 'DeMark Projected Range',
    placement: 'overlay',
    defaultConfig: {},
    shortName: 'DeMark',
    plots: [
      { key: 'high', title: 'Projected high', color: 0, kind: 'step' },
      { key: 'low', title: 'Projected low', color: 1, kind: 'step' },
    ],
  };

  protected read(_config: IndicatorConfig): null {
    return null;
  }

  protected pointAt(data: DataSeries, i: number): IndicatorValue | null {
    if (i === 0) return null;
    const { open, high, low, close } = data[i - 1];
    const x = close > open ? 2 * high + low + close : close < open ? high + 2 * low + close : high + low + 2 * close;
    return { high: x / 2 - low, low: x / 2 - high };
  }
}
