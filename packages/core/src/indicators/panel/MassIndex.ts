import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';

/**
 * Mass Index (Donald Dorsey) — flags reversals by watching the high-low range
 * widen and contract. A "reversal bulge" forms when the index rises above 27
 * then falls back below 26.5. MI = Σ(EMA(range) / EMA(EMA(range))) over 25 bars.
 */
export class MassIndexIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'massindex',
    name: 'Mass Index',
    placement: 'panel' as const,
    defaultConfig: { ema: 9, sum: 25 },
    shortName: 'Mass',
    plots: [{ key: 'value', title: 'Mass', color: 0 }],
    levels: [26.5, 27],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const emaP = getIntParam(config, 'ema', 9, 1);
    const sumP = getIntParam(config, 'sum', 25, 1);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const n = data.length;
    if (n < sumP) return { values, series };

    const k = 2 / (emaP + 1);
    let ema1: number | undefined;
    let ema2: number | undefined;
    const ratio = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      const range = data[i].high - data[i].low;
      ema1 = ema1 === undefined ? range : range * k + ema1 * (1 - k);
      ema2 = ema2 === undefined ? ema1 : ema1 * k + ema2 * (1 - k);
      ratio[i] = ema2 !== 0 ? ema1 / ema2 : 1;
    }

    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += ratio[i];
      if (i >= sumP) sum -= ratio[i - sumP];
      if (i >= emaP + sumP) {
        const val: IndicatorValue = { value: sum };
        values.set(data[i].time, val);
        series[i] = val;
      }
    }
    return { values, series };
  }
}
