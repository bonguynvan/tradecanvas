import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { closes, highestAt, outputOf, pointsOf, type Num } from '../math.js';

/**
 * Ulcer Index: the depth and length of drawdowns — the root mean square of
 * each close's percent drop from the highest close of the `period` bars
 * before it, over `period` bars.
 */
export class UlcerIndexIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'ulcer',
    name: 'Ulcer Index',
    placement: 'panel',
    defaultConfig: { period: 14, source: 'close' },
    shortName: 'Ulcer',
    inputs: { period: { min: 1 }, source: { source: true } },
    plots: [{ key: 'value', title: 'Ulcer', color: 0 }],
    scale: { min: 0 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 14, 1);
    const src = closes(data);
    const drawdown: Num[] = src.map((c, i) => {
      const max = highestAt(src, i, period);
      return max === undefined || max === 0 ? undefined : (100 * (c - max)) / max;
    });
    const out: Num[] = drawdown.map((_, i) => {
      if (i < period - 1) return undefined;
      let sumSq = 0;
      for (let j = i - period + 1; j <= i; j++) {
        const d = drawdown[j];
        if (d === undefined) return undefined;
        sumSq += d * d;
      }
      return Math.sqrt(sumSq / period);
    });
    return outputOf(data, pointsOf(out));
  }
}
