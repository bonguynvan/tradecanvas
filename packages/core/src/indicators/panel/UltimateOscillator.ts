import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';

/**
 * Ultimate Oscillator (Larry Williams) — a 0–100 momentum oscillator that
 * blends three timeframes of buying pressure to reduce the false divergences
 * single-period oscillators produce. Weighted 4:2:1 toward the fastest period.
 * Reference lines at 30 / 70.
 *
 * BP = close − min(low, prevClose); TR = max(high, prevClose) − min(low, prevClose).
 */
export class UltimateOscillatorIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'uo',
    name: 'Ultimate Oscillator',
    placement: 'panel' as const,
    defaultConfig: { fast: 7, mid: 14, slow: 28 },
    shortName: 'UO',
    plots: [{ key: 'value', title: 'UO', color: 0 }],
    scale: { min: 0, max: 100 },
    levels: [30, 70],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const fast = getIntParam(config, 'fast', 7, 1);
    const mid = getIntParam(config, 'mid', 14, 1);
    const slow = getIntParam(config, 'slow', 28, 1);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    if (data.length <= slow) return { values, series };

    const bp = new Array(data.length).fill(0);
    const tr = new Array(data.length).fill(0);
    for (let i = 1; i < data.length; i++) {
      const pc = data[i - 1].close;
      const low = Math.min(data[i].low, pc);
      const high = Math.max(data[i].high, pc);
      bp[i] = data[i].close - low;
      tr[i] = high - low;
    }

    const rolling = (arr: number[], i: number, n: number): number => {
      let s = 0;
      for (let j = i - n + 1; j <= i; j++) s += arr[j];
      return s;
    };

    for (let i = slow; i < data.length; i++) {
      const avgFast = safeDiv(rolling(bp, i, fast), rolling(tr, i, fast));
      const avgMid = safeDiv(rolling(bp, i, mid), rolling(tr, i, mid));
      const avgSlow = safeDiv(rolling(bp, i, slow), rolling(tr, i, slow));
      const uo = (100 * (4 * avgFast + 2 * avgMid + avgSlow)) / 7;
      const val: IndicatorValue = { value: uo };
      values.set(data[i].time, val);
      series[i] = val;
    }
    return { values, series };
  }
}

function safeDiv(a: number, b: number): number {
  return b === 0 ? 0 : a / b;
}
