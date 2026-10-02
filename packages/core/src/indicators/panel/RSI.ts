import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';

export class RSIIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'rsi',
    name: 'Relative Strength Index',
    placement: 'panel' as const,
    defaultConfig: { period: 14, source: 'close' },
    shortName: 'RSI',
    inputs: { source: { source: true } },
    plots: [{ key: 'value', title: 'RSI', color: 0 }],
    scale: { min: 0, max: 100 },
    levels: [30, 70],
  };

  /** Wilder's running averages per bar — the RSI value alone can't be inverted back into them. */
  private smoothing = new WeakMap<IndicatorOutput, { gain: number[]; loss: number[] }>();

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 14, 1);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const output: IndicatorOutput = { values, series };

    if (data.length < period + 1) return output;

    const gains: number[] = [];
    const losses: number[] = [];
    let avgGain = 0;
    let avgLoss = 0;

    for (let i = 1; i <= period; i++) {
      const change = data[i].close - data[i - 1].close;
      if (change > 0) avgGain += change;
      else avgLoss -= change;
    }
    avgGain /= period;
    avgLoss /= period;
    gains[period] = avgGain;
    losses[period] = avgLoss;

    const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    const val0: IndicatorValue = { value: rsi };
    values.set(data[period].time, val0);
    series[period] = val0;

    for (let i = period + 1; i < data.length; i++) {
      const change = data[i].close - data[i - 1].close;
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? -change : 0;
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      gains[i] = avgGain;
      losses[i] = avgLoss;
      const rs = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
      const val: IndicatorValue = { value: rs };
      values.set(data[i].time, val);
      series[i] = val;
    }
    this.smoothing.set(output, { gain: gains, loss: losses });
    return output;
  }

  update(data: DataSeries, config: IndicatorConfig, prev: IndicatorOutput, from: number): IndicatorOutput | null {
    const period = getIntParam(config, 'period', 14, 1);
    const state = this.smoothing.get(prev);
    // Needs the smoothed averages at from-1, which exist from bar `period` on.
    if (!state || from <= period || !this.canResume(data, prev, from)) return null;
    let avgGain = state.gain[from - 1];
    let avgLoss = state.loss[from - 1];
    if (avgGain === undefined || avgLoss === undefined) return null;
    for (let i = from; i < data.length; i++) {
      const change = data[i].close - data[i - 1].close;
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? -change : 0;
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      state.gain[i] = avgGain;
      state.loss[i] = avgLoss;
      const rs = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
      this.writePoint(prev, data, i, { value: rs });
    }
    return prev;
  }
}
