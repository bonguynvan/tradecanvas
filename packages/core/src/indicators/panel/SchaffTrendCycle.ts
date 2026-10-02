import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';

/**
 * Schaff Trend Cycle (Doug Schaff) — runs a MACD line through two passes of
 * stochastic smoothing to produce a fast, cyclic 0–100 trend oscillator that
 * turns earlier than MACD. Above 75 and turning down = overbought; below 25 and
 * turning up = oversold. Reference lines at 25 / 75.
 */
export class SchaffTrendCycleIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'stc',
    name: 'Schaff Trend Cycle',
    placement: 'panel' as const,
    defaultConfig: { fast: 23, slow: 50, cycle: 10, source: 'close' },
    shortName: 'STC',
    inputs: { source: { source: true } },
    plots: [{ key: 'value', title: 'STC', color: 0 }],
    scale: { min: 0, max: 100 },
    levels: [25, 75],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const fast = getIntParam(config, 'fast', 23, 1);
    const slow = getIntParam(config, 'slow', 50, 1);
    const cycle = getIntParam(config, 'cycle', 10, 1);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const n = data.length;
    if (n === 0) return { values, series };

    const close = data.map((b) => b.close);

    // MACD line.
    const kf = 2 / (fast + 1);
    const ks = 2 / (slow + 1);
    let ef = close[0];
    let es = close[0];
    const macd = new Array(n);
    for (let i = 0; i < n; i++) {
      ef = i === 0 ? close[0] : close[i] * kf + ef * (1 - kf);
      es = i === 0 ? close[0] : close[i] * ks + es * (1 - ks);
      macd[i] = ef - es;
    }

    // First stochastic pass over MACD → smoothed %D (d1).
    const d1 = stochSmooth(macd, cycle);
    // Second stochastic pass over d1 → STC.
    const stc = stochSmooth(d1, cycle);

    for (let i = 0; i < n; i++) {
      const v = stc[i];
      if (v === undefined) continue;
      const val: IndicatorValue = { value: Math.max(0, Math.min(100, v)) };
      values.set(data[i].time, val);
      series[i] = val;
    }
    return { values, series };
  }
}

/**
 * One stochastic-smoothing pass: %K over a `cycle` window, then a 0.5-factor
 * recursive smoother. Input may be sparse (undefined); output is undefined
 * until a full window of defined inputs is available.
 */
function stochSmooth(src: (number | undefined)[], cycle: number): (number | undefined)[] {
  const n = src.length;
  const out: (number | undefined)[] = new Array(n).fill(undefined);
  let prev: number | undefined;
  for (let i = 0; i < n; i++) {
    if (i < cycle - 1) continue;
    let ll = Infinity;
    let hh = -Infinity;
    let ok = true;
    for (let j = i - cycle + 1; j <= i; j++) {
      const v = src[j];
      if (v === undefined) { ok = false; break; }
      if (v < ll) ll = v;
      if (v > hh) hh = v;
    }
    if (!ok || src[i] === undefined) continue;
    const k = hh - ll > 0 ? ((src[i]! - ll) / (hh - ll)) * 100 : 50;
    prev = prev === undefined ? k : prev + 0.5 * (k - prev);
    out[i] = prev;
  }
  return out;
}
