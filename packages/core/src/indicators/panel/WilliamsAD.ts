import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';

/**
 * Williams Accumulation/Distribution (Larry Williams) — a cumulative line that
 * adds the move from the "true range low" on up-closes and subtracts the move
 * from the "true range high" on down-closes. Divergence between WAD and price
 * signals accumulation or distribution ahead of a turn.
 */
export class WilliamsADIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'wad',
    name: 'Williams A/D',
    placement: 'panel' as const,
    defaultConfig: {},
    shortName: 'WAD',
    plots: [{ key: 'value', title: 'WAD', color: 0 }],
  };

  calculate(data: DataSeries, _config: IndicatorConfig): IndicatorOutput {
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const n = data.length;
    if (n === 0) return { values, series };

    let wad = 0;
    values.set(data[0].time, { value: 0 });
    series[0] = { value: 0 };
    for (let i = 1; i < n; i++) {
      const pc = data[i - 1].close;
      const close = data[i].close;
      if (close > pc) wad += close - Math.min(data[i].low, pc);
      else if (close < pc) wad += close - Math.max(data[i].high, pc);
      const val: IndicatorValue = { value: wad };
      values.set(data[i].time, val);
      series[i] = val;
    }
    return { values, series };
  }
}
