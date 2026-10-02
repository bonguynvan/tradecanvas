import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';

/**
 * Fisher Transform (John Ehlers) — maps price into a roughly Gaussian
 * distribution so turning points stand out as sharp peaks. Plotted with a
 * one-bar lagged trigger line; the Fisher crossing its trigger flags reversals.
 * Zero-centered, auto-scaled.
 */
export class FisherTransformIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'fisher',
    name: 'Fisher Transform',
    placement: 'panel' as const,
    defaultConfig: { period: 9 },
    shortName: 'Fisher',
    plots: [
      { key: 'value', title: 'Fisher', color: 0 },
      { key: 'trigger', title: 'Trigger', color: 1 },
    ],
    levels: [0],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 9, 1);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const n = data.length;
    if (n < period) return { values, series };

    const mid = data.map((b) => (b.high + b.low) / 2);
    let value = 0;
    let fisher = 0;

    for (let i = period - 1; i < n; i++) {
      let hh = -Infinity;
      let ll = Infinity;
      for (let j = i - period + 1; j <= i; j++) {
        if (mid[j] > hh) hh = mid[j];
        if (mid[j] < ll) ll = mid[j];
      }
      const raw = hh - ll > 0 ? (2 * (mid[i] - ll)) / (hh - ll) - 1 : 0;
      value = 0.33 * raw + 0.67 * value;
      value = Math.max(-0.999, Math.min(0.999, value));
      const prevFisher = fisher;
      fisher = 0.5 * Math.log((1 + value) / (1 - value)) + 0.5 * fisher;
      const val: IndicatorValue = { value: fisher, trigger: prevFisher };
      values.set(data[i].time, val);
      series[i] = val;
    }
    return { values, series };
  }
}
