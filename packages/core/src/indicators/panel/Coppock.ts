import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';

/**
 * Coppock Curve (Edwin Coppock) — a long-term momentum oscillator: a weighted
 * moving average of the sum of two rates of change. Designed to flag major
 * bottoms when it turns up from below zero. Zero-centered, auto-scaled.
 *
 * Coppock = WMA(wma, ROC(longRoc) + ROC(shortRoc))
 */
export class CoppockIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'coppock',
    name: 'Coppock Curve',
    placement: 'panel' as const,
    defaultConfig: { longRoc: 14, shortRoc: 11, wma: 10 },
    shortName: 'Coppock',
    plots: [{ key: 'value', title: 'Coppock', color: 0 }],
    levels: [0],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const longRoc = getIntParam(config, 'longRoc', 14, 1);
    const shortRoc = getIntParam(config, 'shortRoc', 11, 1);
    const wmaPeriod = getIntParam(config, 'wma', 10, 1);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const n = data.length;
    const maxRoc = Math.max(longRoc, shortRoc);
    if (n <= maxRoc + wmaPeriod) return { values, series };

    const close = data.map((b) => b.close);
    const roc = (i: number, p: number): number => (close[i - p] !== 0 ? ((close[i] - close[i - p]) / close[i - p]) * 100 : 0);

    // Combined ROC sum, defined from index maxRoc.
    const sum: (number | undefined)[] = new Array(n).fill(undefined);
    for (let i = maxRoc; i < n; i++) sum[i] = roc(i, longRoc) + roc(i, shortRoc);

    // Weighted MA (weights 1..wmaPeriod, newest heaviest) of the sum.
    const denom = (wmaPeriod * (wmaPeriod + 1)) / 2;
    for (let i = maxRoc + wmaPeriod - 1; i < n; i++) {
      let acc = 0;
      let ok = true;
      for (let w = 0; w < wmaPeriod; w++) {
        const s = sum[i - w];
        if (s === undefined) { ok = false; break; }
        acc += s * (wmaPeriod - w);
      }
      if (!ok) continue;
      const val: IndicatorValue = { value: acc / denom };
      values.set(data[i].time, val);
      series[i] = val;
    }
    return { values, series };
  }
}
