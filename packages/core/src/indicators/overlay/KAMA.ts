import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { outputOf } from '../math.js';

/**
 * Kaufman Adaptive Moving Average: fast when price moves in a straight line,
 * slow when it chops. The efficiency ratio (net change over the sum of bar
 * moves, across `period` bars) blends a `fast` and a `slow` EMA constant.
 */
export class KAMAIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'kama',
    name: 'Kaufman Adaptive Moving Average',
    placement: 'overlay',
    defaultConfig: { period: 10, fast: 2, slow: 30, source: 'close' },
    shortName: 'KAMA',
    inputs: { period: { min: 1 }, fast: { min: 1 }, slow: { min: 1 }, source: { source: true } },
    plots: [{ key: 'value', title: 'KAMA', color: 0 }],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const output = outputOf(data, new Array(data.length).fill(null));
    const period = getIntParam(config, 'period', 10, 1);
    if (data.length <= period) return output;
    this.extend(data, config, output, period, data[period - 1].close);
    return output;
  }

  update(data: DataSeries, config: IndicatorConfig, prev: IndicatorOutput, from: number): IndicatorOutput | null {
    const period = getIntParam(config, 'period', 10, 1);
    if (from <= period || !this.canResume(data, prev, from)) return null;
    const kama = prev.series![from - 1]?.value;
    if (kama === undefined) return null;
    this.extend(data, config, prev, from, kama);
    return prev;
  }

  /** Step the average from `kama` (its value at `from - 1`) over bars `from` on. */
  private extend(data: DataSeries, config: IndicatorConfig, out: IndicatorOutput, from: number, kama: number): void {
    const period = getIntParam(config, 'period', 10, 1);
    const fastSc = 2 / (getIntParam(config, 'fast', 2, 1) + 1);
    const slowSc = 2 / (getIntParam(config, 'slow', 30, 1) + 1);
    for (let i = from; i < data.length; i++) {
      let noise = 0;
      for (let j = i - period + 1; j <= i; j++) noise += Math.abs(data[j].close - data[j - 1].close);
      const change = Math.abs(data[i].close - data[i - period].close);
      const er = noise > 0 ? change / noise : 0;
      const sc = (er * (fastSc - slowSc) + slowSc) ** 2;
      kama += sc * (data[i].close - kama);
      this.writePoint(out, data, i, { value: kama });
    }
  }
}
