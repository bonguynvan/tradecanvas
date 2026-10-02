import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';

/**
 * Detrended Price Oscillator (DPO) — removes the longer trend to expose price
 * cycles by comparing a past close to a simple moving average:
 *   DPO[i] = close[i − (period/2 + 1)] − SMA(close, period)[i]
 * Not a momentum oscillator — it's a cycle/peak-trough tool. Zero-centered.
 */
export class DetrendedPriceOscillatorIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'dpo',
    name: 'Detrended Price Oscillator',
    placement: 'panel' as const,
    defaultConfig: { period: 20 },
    shortName: 'DPO',
    plots: [{ key: 'value', title: 'DPO', color: 0, kind: 'histogram', tone: 'sign', downColor: 1 }],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 20, 2);
    const shift = Math.floor(period / 2) + 1;
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const n = data.length;
    if (n < period) return { values, series };

    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += data[i].close;
      if (i >= period) sum -= data[i - period].close;
      if (i >= period - 1 && i - shift >= 0) {
        const sma = sum / period;
        const val: IndicatorValue = { value: data[i - shift].close - sma };
        values.set(data[i].time, val);
        series[i] = val;
      }
    }
    return { values, series };
  }
}
