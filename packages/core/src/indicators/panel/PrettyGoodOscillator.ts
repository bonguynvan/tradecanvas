import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';

/**
 * Pretty Good Oscillator (Mark Johnson) — the distance of the close from its
 * SMA, measured in units of Average True Range. Because it is ATR-normalised,
 * the ±3 reference levels mean the same thing across instruments: breakouts
 * trade above +3 / below −3, while reversions cross back through zero.
 *
 * PGO = (close − SMA(close, n)) / ATR(n)
 */
export class PrettyGoodOscillatorIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'pgo',
    name: 'Pretty Good Oscillator',
    placement: 'panel' as const,
    defaultConfig: { period: 14 },
    shortName: 'PGO',
    plots: [{ key: 'value', title: 'PGO', color: 0 }],
    levels: [-3, 0, 3],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 14, 1);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const n = data.length;
    if (n <= period) return { values, series };

    // Wilder-smoothed ATR.
    const tr = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      if (i === 0) { tr[i] = data[i].high - data[i].low; continue; }
      const pc = data[i - 1].close;
      tr[i] = Math.max(data[i].high - data[i].low, Math.abs(data[i].high - pc), Math.abs(data[i].low - pc));
    }
    const atr = new Array(n).fill(undefined as number | undefined);
    let seed = 0;
    for (let i = 1; i <= period; i++) seed += tr[i];
    atr[period] = seed / period;
    for (let i = period + 1; i < n; i++) {
      atr[i] = (atr[i - 1]! * (period - 1) + tr[i]) / period;
    }

    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += data[i].close;
      if (i >= period) sum -= data[i - period].close;
      if (i >= period && atr[i] !== undefined && atr[i]! > 0) {
        const ma = sum / period;
        const val: IndicatorValue = { value: (data[i].close - ma) / atr[i]! };
        values.set(data[i].time, val);
        series[i] = val;
      }
    }
    return { values, series };
  }
}
