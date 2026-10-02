import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';

/**
 * TRIX (Jack Hutson) — the percent rate of change of a triple-smoothed EMA of
 * close. Triple smoothing filters out cycles shorter than the period, leaving a
 * clean momentum line that oscillates around zero; a signal EMA of TRIX gives
 * crossover entries.
 */
export class TRIXIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'trix',
    name: 'TRIX',
    placement: 'panel' as const,
    defaultConfig: { period: 15, signal: 9, source: 'close' },
    shortName: 'TRIX',
    inputs: { source: { source: true } },
    plots: [
      { key: 'value', title: 'TRIX', color: 0 },
      { key: 'signal', title: 'Signal', color: 1 },
    ],
    levels: [0],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 15, 1);
    const signalP = getIntParam(config, 'signal', 9, 1);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const n = data.length;
    if (n < 2) return { values, series };

    const close = data.map((b) => b.close);
    const e1 = ema(close, period);
    const e2 = ema(e1, period);
    const e3 = ema(e2, period);

    const trix = new Array(n).fill(0);
    for (let i = 1; i < n; i++) {
      trix[i] = e3[i - 1] !== 0 ? ((e3[i] - e3[i - 1]) / e3[i - 1]) * 100 : 0;
    }
    const sig = ema(trix, signalP);

    // Skip the first 3·period bars where the triple EMA hasn't settled.
    const warm = 3 * period;
    for (let i = warm; i < n; i++) {
      const val: IndicatorValue = { value: trix[i], signal: sig[i] };
      values.set(data[i].time, val);
      series[i] = val;
    }
    return { values, series };
  }
}

function ema(src: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out = new Array(src.length).fill(0);
  let prev = src[0] ?? 0;
  out[0] = prev;
  for (let i = 1; i < src.length; i++) {
    prev = src[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}
