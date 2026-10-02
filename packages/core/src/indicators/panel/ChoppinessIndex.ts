import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';

/**
 * Choppiness Index — measures whether the market is trending or consolidating
 * on a 0–100 scale. High (> 61.8) = choppy/range; low (< 38.2) = trending. It
 * does not indicate direction, only the degree of trendiness.
 *
 * CHOP = 100 · log10( Σ TR(n) / (maxHigh(n) − minLow(n)) ) / log10(n)
 */
export class ChoppinessIndexIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'chop',
    name: 'Choppiness Index',
    placement: 'panel' as const,
    defaultConfig: { period: 14 },
    shortName: 'CHOP',
    plots: [{ key: 'value', title: 'CHOP', color: 0 }],
    scale: { min: 0, max: 100 },
    levels: [38.2, 61.8],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 14, 2);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    if (data.length <= period) return { values, series };

    const tr = new Array(data.length).fill(0);
    for (let i = 1; i < data.length; i++) {
      const h = data[i].high;
      const l = data[i].low;
      const pc = data[i - 1].close;
      tr[i] = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
    }

    const logN = Math.log10(period);
    let sumTR = 0;
    for (let i = 1; i < data.length; i++) {
      sumTR += tr[i];
      if (i > period) sumTR -= tr[i - period];

      if (i >= period) {
        let hh = -Infinity;
        let ll = Infinity;
        for (let j = i - period + 1; j <= i; j++) {
          if (data[j].high > hh) hh = data[j].high;
          if (data[j].low < ll) ll = data[j].low;
        }
        const range = hh - ll;
        if (range > 0 && sumTR > 0) {
          const chop = Math.max(0, Math.min(100, (100 * Math.log10(sumTR / range)) / logN));
          const val: IndicatorValue = { value: chop };
          values.set(data[i].time, val);
          series[i] = val;
        }
      }
    }
    return { values, series };
  }
}
