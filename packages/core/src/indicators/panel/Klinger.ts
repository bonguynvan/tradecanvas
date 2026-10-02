import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';

/**
 * Klinger Volume Oscillator (Stephen Klinger) — compares volume flowing in/out
 * of an instrument to price movement to spot longer-term money-flow trends
 * while staying sensitive to short-term reversals. KVO crossing its signal line
 * (and the zero line) flags shifts. Zero-centered, auto-scaled.
 *
 * Volume Force = volume · |2·(dm/cm − 1)| · trend · 100, where dm = high − low,
 * cm accumulates dm while the trend persists; KVO = EMA(VF, fast) − EMA(VF, slow).
 */
export class KlingerIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'kvo',
    name: 'Klinger Oscillator',
    placement: 'panel' as const,
    defaultConfig: { fast: 34, slow: 55, signal: 13 },
    shortName: 'KVO',
    plots: [
      { key: 'value', title: 'KVO', color: 0 },
      { key: 'signal', title: 'Signal', color: 1 },
    ],
    levels: [0],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const fast = getIntParam(config, 'fast', 34, 1);
    const slow = getIntParam(config, 'slow', 55, 1);
    const signalP = getIntParam(config, 'signal', 13, 1);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const n = data.length;
    if (n < 2) return { values, series };

    const kFast = 2 / (fast + 1);
    const kSlow = 2 / (slow + 1);
    const kSig = 2 / (signalP + 1);

    let prevHLC: number | undefined;
    let prevTrend = 1;
    let prevDM = 0;
    let cm = 0;
    let emaFast: number | undefined;
    let emaSlow: number | undefined;
    let emaSig: number | undefined;

    for (let i = 0; i < n; i++) {
      const bar = data[i];
      const hlc = bar.high + bar.low + bar.close;
      const trend = prevHLC === undefined ? 1 : hlc > prevHLC ? 1 : -1;
      const dm = bar.high - bar.low;
      if (prevHLC === undefined) cm = dm;
      else cm = trend === prevTrend ? cm + dm : prevDM + dm;
      const vf = cm !== 0 ? bar.volume * Math.abs(2 * (dm / cm - 1)) * trend * 100 : 0;

      emaFast = emaFast === undefined ? vf : vf * kFast + emaFast * (1 - kFast);
      emaSlow = emaSlow === undefined ? vf : vf * kSlow + emaSlow * (1 - kSlow);
      const kvo = emaFast - emaSlow;
      emaSig = emaSig === undefined ? kvo : kvo * kSig + emaSig * (1 - kSig);

      prevHLC = hlc;
      prevTrend = trend;
      prevDM = dm;

      if (i >= slow) {
        const val: IndicatorValue = { value: kvo, signal: emaSig };
        values.set(bar.time, val);
        series[i] = val;
      }
    }
    return { values, series };
  }
}
