import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';

/**
 * Relative Momentum Index (Roger Altman) — a generalisation of RSI that
 * compares the close to the close `momentum` bars ago instead of one bar ago,
 * then Wilder-smooths the up/down moves over `period`. Larger momentum lookback
 * yields a smoother, less twitchy 0–100 oscillator. 30 / 70 reference bands.
 */
export class RelativeMomentumIndexIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'rmi',
    name: 'Relative Momentum Index',
    placement: 'panel' as const,
    defaultConfig: { period: 20, momentum: 5 },
    shortName: 'RMI',
    plots: [{ key: 'value', title: 'RMI', color: 0 }],
    scale: { min: 0, max: 100 },
    levels: [30, 70],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 20, 1);
    const mom = getIntParam(config, 'momentum', 5, 1);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const n = data.length;
    if (n <= period + mom) return { values, series };

    const closes = data.map((b) => b.close);
    const up: number[] = new Array(n).fill(0);
    const down: number[] = new Array(n).fill(0);
    for (let i = mom; i < n; i++) {
      const ch = closes[i] - closes[i - mom];
      up[i] = ch > 0 ? ch : 0;
      down[i] = ch < 0 ? -ch : 0;
    }

    // Wilder seed over the first `period` momentum-changes (indices mom..mom+period-1).
    let avgUp = 0;
    let avgDown = 0;
    const seedEnd = mom + period;
    for (let i = mom + 1; i <= seedEnd; i++) {
      avgUp += up[i];
      avgDown += down[i];
    }
    avgUp /= period;
    avgDown /= period;
    const emit = (i: number) => {
      const rmi = avgDown === 0 ? 100 : 100 - 100 / (1 + avgUp / avgDown);
      const val: IndicatorValue = { value: rmi };
      values.set(data[i].time, val);
      series[i] = val;
    };
    emit(seedEnd);
    for (let i = seedEnd + 1; i < n; i++) {
      avgUp = (avgUp * (period - 1) + up[i]) / period;
      avgDown = (avgDown * (period - 1) + down[i]) / period;
      emit(i);
    }
    return { values, series };
  }
}
