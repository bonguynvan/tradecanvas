import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorValue } from '@tradecanvas/commons';
import { PointwiseIndicator } from '../PointwiseIndicator.js';
import { getIntParam } from '../params.js';

/**
 * Volume Ratio: the volume of the last `period` bars that closed up against
 * those that closed down, unchanged bars split half and half, in percent.
 * 100 is balance; below 70 often marks a low, above 450 an overheated market.
 * No value while nothing fell or stayed flat.
 */
export class VolumeRatioIndicator extends PointwiseIndicator<number> {
  descriptor: IndicatorDescriptor = {
    id: 'vr',
    name: 'Volume Ratio',
    placement: 'panel',
    defaultConfig: { period: 20 },
    shortName: 'VR',
    plots: [{ key: 'value', title: 'VR', color: 0 }],
    levels: [70, 150, 450],
  };

  protected read(config: IndicatorConfig): number {
    return getIntParam(config, 'period', 20, 1);
  }

  protected pointAt(data: DataSeries, i: number, period: number): IndicatorValue | null {
    if (i < period) return null;
    let up = 0;
    let down = 0;
    let flat = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const d = data[j].close - data[j - 1].close;
      if (d > 0) up += data[j].volume;
      else if (d < 0) down += data[j].volume;
      else flat += data[j].volume;
    }
    const against = down + flat / 2;
    return against > 0 ? { value: ((up + flat / 2) / against) * 100 } : null;
  }
}
