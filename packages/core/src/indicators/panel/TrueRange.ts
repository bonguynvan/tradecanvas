import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorValue } from '@tradecanvas/commons';
import { PointwiseIndicator } from '../PointwiseIndicator.js';

/** True Range: each bar's range, stretched to the previous close when it gapped; ATR is its average. */
export class TrueRangeIndicator extends PointwiseIndicator<null> {
  descriptor: IndicatorDescriptor = {
    id: 'tr',
    name: 'True Range',
    placement: 'panel',
    defaultConfig: {},
    shortName: 'TR',
    plots: [{ key: 'value', title: 'TR', color: 0 }],
  };

  protected read(_config: IndicatorConfig): null {
    return null;
  }

  protected pointAt(data: DataSeries, i: number): IndicatorValue | null {
    const bar = data[i];
    if (i === 0) return { value: bar.high - bar.low };
    const prev = data[i - 1].close;
    return { value: Math.max(bar.high - bar.low, Math.abs(bar.high - prev), Math.abs(bar.low - prev)) };
  }
}
