import type { IndicatorDescriptor, DataSeries, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';

/**
 * Accelerator Oscillator (Bill Williams) — measures the acceleration or
 * deceleration of the current market driving force. It leads the Awesome
 * Oscillator: a change in momentum shows here before price reacts.
 *
 * AO = SMA(median, 5) − SMA(median, 34),  median = (high + low) / 2
 * AC = AO − SMA(AO, 5)
 *
 * Drawn as a histogram in the up colour when the bar is higher than the
 * previous one (accelerating up), the down colour when lower. `up` is 1 on
 * an up bar, 0 otherwise.
 */
export class AcceleratorOscillatorIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'ac',
    name: 'Accelerator Oscillator',
    placement: 'panel' as const,
    defaultConfig: {},
    shortName: 'AC',
    plots: [{ key: 'value', title: 'AC', color: 0, kind: 'histogram', tone: { field: 'up' }, downColor: 1 }],
  };

  calculate(data: DataSeries): IndicatorOutput {
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    const n = data.length;
    if (n < 38) return { values, series };

    const median = data.map((b) => (b.high + b.low) / 2);
    const ao: (number | undefined)[] = new Array(n).fill(undefined);
    for (let i = 33; i < n; i++) {
      ao[i] = sma(median, i, 5) - sma(median, i, 34);
    }

    let prev: number | undefined;
    for (let i = 33 + 4; i < n; i++) {
      let s = 0;
      for (let j = i - 4; j <= i; j++) s += ao[j]!;
      const ac = ao[i]! - s / 5;
      const rising = prev === undefined ? ac >= 0 : ac >= prev;
      prev = ac;
      const val: IndicatorValue = { value: ac, up: rising ? 1 : 0 };
      values.set(data[i].time, val);
      series[i] = val;
    }
    return { values, series };
  }
}

/** SMA of `src` ending at index `i`, window `period` (caller guarantees i ≥ period − 1). */
function sma(src: number[], i: number, period: number): number {
  let sum = 0;
  for (let j = i - period + 1; j <= i; j++) sum += src[j];
  return sum / period;
}
