import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';

/**
 * Relative Vigor Index (John Ehlers) — gauges trend conviction on the premise
 * that in an uptrend price closes higher than it opens (and vice-versa),
 * normalised by the bar range and symmetrically (1-2-2-1) smoothed. RVI
 * crossing its signal line flags momentum shifts. Oscillates around zero.
 */
export class RelativeVigorIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'rvi',
    name: 'Relative Vigor Index',
    placement: 'panel' as const,
    defaultConfig: { period: 10 },
    shortName: 'RVGI',
    plots: [
      { key: 'value', title: 'RVGI', color: 0 },
      { key: 'signal', title: 'Signal', color: 1 },
    ],
    levels: [0],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 10, 1);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const n = data.length;
    if (n < period + 3) return { values, series };

    const num = new Array(n).fill(0); // close − open
    const den = new Array(n).fill(0); // high − low
    for (let i = 0; i < n; i++) {
      num[i] = data[i].close - data[i].open;
      den[i] = data[i].high - data[i].low;
    }

    // Symmetric (1,2,2,1)/6 weighting.
    const sw = (arr: number[], i: number): number =>
      (arr[i] + 2 * arr[i - 1] + 2 * arr[i - 2] + arr[i - 3]) / 6;

    const numS = new Array(n).fill(undefined as number | undefined);
    const denS = new Array(n).fill(undefined as number | undefined);
    for (let i = 3; i < n; i++) {
      numS[i] = sw(num, i);
      denS[i] = sw(den, i);
    }

    // RVI = SMA(numS, period) / SMA(denS, period).
    const rvi = new Array(n).fill(undefined as number | undefined);
    for (let i = 3 + period - 1; i < n; i++) {
      let ns = 0;
      let ds = 0;
      for (let j = i - period + 1; j <= i; j++) {
        ns += numS[j]!;
        ds += denS[j]!;
      }
      rvi[i] = ds !== 0 ? ns / ds : 0;
    }

    for (let i = 0; i < n; i++) {
      if (rvi[i] === undefined) continue;
      const val: IndicatorValue = { value: rvi[i] };
      if (i >= 3 && rvi[i - 3] !== undefined) {
        val.signal = (rvi[i]! + 2 * rvi[i - 1]! + 2 * rvi[i - 2]! + rvi[i - 3]!) / 6;
      }
      values.set(data[i].time, val);
      series[i] = val;
    }
    return { values, series };
  }
}
