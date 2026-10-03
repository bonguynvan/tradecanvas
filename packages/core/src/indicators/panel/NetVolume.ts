import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorValue } from '@tradecanvas/commons';
import { PointwiseIndicator } from '../PointwiseIndicator.js';

/** Net Volume: each bar's volume, positive on a higher close, negative on a lower one, none when unchanged. */
export class NetVolumeIndicator extends PointwiseIndicator<null> {
  descriptor: IndicatorDescriptor = {
    id: 'netvolume',
    name: 'Net Volume',
    placement: 'panel',
    defaultConfig: {},
    shortName: 'Net Vol',
    plots: [{ key: 'value', title: 'Net', color: 0, kind: 'histogram', tone: { field: 'up' }, downColor: 1 }],
    levels: [0],
  };

  protected read(_config: IndicatorConfig): null {
    return null;
  }

  protected pointAt(data: DataSeries, i: number): IndicatorValue | null {
    if (i === 0) return null;
    const move = data[i].close - data[i - 1].close;
    const volume = data[i].volume ?? 0;
    return { value: move > 0 ? volume : move < 0 ? -volume : 0, up: move >= 0 ? 1 : 0 };
  }

  /** A bar's value reads the close before it. */
  protected lookback(): number {
    return 1;
  }
}
