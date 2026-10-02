import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';


/**
 * Ease of Movement (Richard Arms) — relates the day's midpoint move to its
 * volume to show how much volume it took to move price. High positive = price
 * rising on light volume (easy); negative = falling easily. SMA-smoothed,
 * zero-centered.
 *
 * EMV = SMA( midpointMove · (high − low) / volume , period ).
 */
export class EaseOfMovementIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'emv',
    name: 'Ease of Movement',
    placement: 'panel' as const,
    defaultConfig: { period: 14 },
    shortName: 'EOM',
    plots: [{ key: 'value', title: 'EOM', color: 0 }],
    levels: [0],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 14, 1);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const n = data.length;
    if (n < 2) return { values, series };

    const raw = new Array(n).fill(0);
    for (let i = 1; i < n; i++) {
      const mid = (data[i].high + data[i].low) / 2;
      const prevMid = (data[i - 1].high + data[i - 1].low) / 2;
      const range = data[i].high - data[i].low;
      const vol = data[i].volume;
      raw[i] = vol > 0 ? ((mid - prevMid) * range) / vol : 0;
    }

    let sum = 0;
    for (let i = 1; i < n; i++) {
      sum += raw[i];
      if (i > period) sum -= raw[i - period];
      if (i >= period) {
        const val: IndicatorValue = { value: sum / period };
        values.set(data[i].time, val);
        series[i] = val;
      }
    }
    return { values, series };
  }
}
