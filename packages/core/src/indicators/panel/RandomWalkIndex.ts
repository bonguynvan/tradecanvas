import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorValue } from '@tradecanvas/commons';
import { PointwiseIndicator } from '../PointwiseIndicator.js';
import { getIntParam } from '../params.js';

function trueRangeAt(data: DataSeries, i: number): number {
  const bar = data[i];
  if (i === 0) return bar.high - bar.low;
  const prev = data[i - 1].close;
  return Math.max(bar.high - bar.low, Math.abs(bar.high - prev), Math.abs(bar.low - prev));
}

/**
 * Random Walk Index: whether prices moved further than a random walk would.
 * For each span k from 2 to `period` bars: high − the low k bars ago (RWI
 * high), and the high k bars ago − low (RWI low), each over the average true
 * range of those k bars × √k; the largest over k, from 0. Above 1 the move
 * beats chance.
 */
export class RandomWalkIndexIndicator extends PointwiseIndicator<number> {
  descriptor: IndicatorDescriptor = {
    id: 'rwi',
    name: 'Random Walk Index',
    placement: 'panel',
    defaultConfig: { period: 14 },
    shortName: 'RWI',
    plots: [
      { key: 'high', title: 'RWI High', color: 0 },
      { key: 'low', title: 'RWI Low', color: 1 },
    ],
    levels: [1],
  };

  protected read(config: IndicatorConfig): number {
    return getIntParam(config, 'period', 14, 2);
  }

  protected pointAt(data: DataSeries, i: number, period: number): IndicatorValue | null {
    if (i < period) return null;
    let high = 0;
    let low = 0;
    // The true ranges of the k bars ending at i, k counting up.
    let trSum = trueRangeAt(data, i);
    for (let k = 1; k <= period; k++) {
      if (k > 1) {
        const scale = (trSum / k) * Math.sqrt(k);
        if (scale > 0) {
          high = Math.max(high, (data[i].high - data[i - k].low) / scale);
          low = Math.max(low, (data[i - k].high - data[i].low) / scale);
        }
      }
      trSum += trueRangeAt(data, i - k);
    }
    return { high, low };
  }
}
