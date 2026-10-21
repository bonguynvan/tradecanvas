import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorValue } from '@tradecanvas/commons';
import { PointwiseIndicator } from '../PointwiseIndicator.js';
import { getIntParam } from '../params.js';

/**
 * AB Ratio, over `period` bars:
 * - A: the rise above the open against the fall below it,
 *   Σ(high − open) / Σ(open − low) × 100: the strength within the bars.
 * - B: the same from the previous close, counting only the part above it
 *   and below it: Σ max(0, high − prev close) / Σ max(0, prev close − low) × 100.
 * 100 is balance. A line has no value while its denominator is 0.
 */
export class ABRatioIndicator extends PointwiseIndicator<number> {
  descriptor: IndicatorDescriptor = {
    id: 'abratio',
    name: 'AB Ratio',
    placement: 'panel',
    defaultConfig: { period: 26 },
    shortName: 'AB Ratio',
    plots: [
      { key: 'a', title: 'A', color: 0 },
      { key: 'b', title: 'B', color: 1 },
    ],
    levels: [100],
  };

  protected read(config: IndicatorConfig): number {
    return getIntParam(config, 'period', 26, 1);
  }

  protected pointAt(data: DataSeries, i: number, period: number): IndicatorValue | null {
    if (i < period) return null;
    let aUp = 0;
    let aDown = 0;
    let bUp = 0;
    let bDown = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const { open, high, low } = data[j];
      const prev = data[j - 1].close;
      aUp += high - open;
      aDown += open - low;
      bUp += Math.max(0, high - prev);
      bDown += Math.max(0, prev - low);
    }
    const point: IndicatorValue = {};
    if (aDown > 0) point.a = (aUp / aDown) * 100;
    if (bDown > 0) point.b = (bUp / bDown) * 100;
    return point.a !== undefined || point.b !== undefined ? point : null;
  }
}
