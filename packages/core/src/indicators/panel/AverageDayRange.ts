import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorValue } from '@tradecanvas/commons';
import { PointwiseIndicator } from '../PointwiseIndicator.js';
import { getIntParam } from '../params.js';

/** Average Day Range: the mean high-to-low range of the last `period` bars (on daily bars, the days'). */
export class AverageDayRangeIndicator extends PointwiseIndicator<number> {
  descriptor: IndicatorDescriptor = {
    id: 'adr',
    name: 'Average Day Range',
    placement: 'panel',
    defaultConfig: { period: 14 },
    shortName: 'ADR',
    inputs: { period: { min: 1 } },
    plots: [{ key: 'value', title: 'ADR', color: 0 }],
    scale: { min: 0 },
  };

  protected read(config: IndicatorConfig): number {
    return getIntParam(config, 'period', 14, 1);
  }

  protected pointAt(data: DataSeries, i: number, period: number): IndicatorValue | null {
    if (i < period - 1) return null;
    let sum = 0;
    for (let k = i - period + 1; k <= i; k++) sum += data[k].high - data[k].low;
    return { value: sum / period };
  }
}
