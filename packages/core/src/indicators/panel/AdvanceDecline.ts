import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorValue } from '@tradecanvas/commons';
import { PointwiseIndicator } from '../PointwiseIndicator.js';
import { getIntParam } from '../params.js';

/**
 * Advance/Decline: of the last `length` bars, those closing above their open
 * over those closing below it (their count when none closed below).
 */
export class AdvanceDeclineIndicator extends PointwiseIndicator<{ length: number }> {
  descriptor: IndicatorDescriptor = {
    id: 'advdecline',
    name: 'Advance/Decline',
    placement: 'panel',
    defaultConfig: { length: 10 },
    shortName: 'A/D Ratio',
    inputs: { length: { min: 1 } },
    plots: [{ key: 'value', title: 'Ratio', color: 0 }],
    scale: { min: 0 },
  };

  protected read(config: IndicatorConfig) {
    return { length: getIntParam(config, 'length', 10, 1) };
  }

  protected pointAt(data: DataSeries, i: number, { length }: { length: number }): IndicatorValue | null {
    if (i < length - 1) return null;
    let advances = 0;
    let declines = 0;
    for (let j = i - length + 1; j <= i; j++) {
      if (data[j].close > data[j].open) advances++;
      else if (data[j].close < data[j].open) declines++;
    }
    return { value: declines === 0 ? advances : advances / declines };
  }
}
