import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorValue } from '@tradecanvas/commons';
import { PointwiseIndicator } from '../PointwiseIndicator.js';
import { getIntParam } from '../params.js';

/**
 * Intraday Intensity (Bostian), as a percent: over `period` bars, the volume
 * weighted by where each bar closed in its range, Σ volume × (2·close − high
 * − low) / (high − low), over Σ volume × 100. +100: every bar closed on its
 * high; −100: on its low. Bars with no range count as the middle; a window
 * with no volume gives 0. Each window is summed afresh, so a long run of
 * fractional volumes can't leave rounding residue behind.
 */
export class IntradayIntensityIndicator extends PointwiseIndicator<number> {
  descriptor: IndicatorDescriptor = {
    id: 'iii',
    name: 'Intraday Intensity',
    placement: 'panel',
    defaultConfig: { period: 21 },
    shortName: 'III',
    plots: [{ key: 'value', title: 'III %', color: 0, kind: 'histogram', tone: 'sign', downColor: 1 }],
    scale: { zero: true },
    levels: [0],
  };

  protected read(config: IndicatorConfig): number {
    return getIntParam(config, 'period', 21, 1);
  }

  protected pointAt(data: DataSeries, i: number, period: number): IndicatorValue | null {
    if (i < period - 1) return null;
    let weighed = 0;
    let volume = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const b = data[j];
      volume += b.volume;
      if (b.high > b.low) weighed += (b.volume * (2 * b.close - b.high - b.low)) / (b.high - b.low);
    }
    if (!(volume > 0)) return { value: 0 };
    return { value: Math.max(-100, Math.min(100, (weighed / volume) * 100)) };
  }
}
