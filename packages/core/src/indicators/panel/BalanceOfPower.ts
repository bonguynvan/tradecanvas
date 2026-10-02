import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';

/**
 * Balance of Power (Igor Livshin) — measures the strength of buyers vs sellers
 * within each bar: (close − open) / (high − low), optionally SMA-smoothed.
 * Above zero = buyers dominate, below = sellers. Bounded roughly to [−1, 1].
 */
export class BalanceOfPowerIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'bop',
    name: 'Balance of Power',
    placement: 'panel' as const,
    defaultConfig: { smooth: 14 },
    shortName: 'BOP',
    plots: [{ key: 'value', title: 'BOP', color: 0 }],
    scale: { min: -1, max: 1 },
    levels: [0],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const smooth = getIntParam(config, 'smooth', 14, 1);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const n = data.length;
    if (n === 0) return { values, series };

    const raw = new Array(n);
    for (let i = 0; i < n; i++) {
      const range = data[i].high - data[i].low;
      raw[i] = range > 0 ? (data[i].close - data[i].open) / range : 0;
    }

    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += raw[i];
      if (i >= smooth) sum -= raw[i - smooth];
      if (i >= smooth - 1) {
        const val: IndicatorValue = { value: sum / smooth };
        values.set(data[i].time, val);
        series[i] = val;
      }
    }
    return { values, series };
  }
}
