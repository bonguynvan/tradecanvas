import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { outputOf, pointsOf, type Num } from '../math.js';

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
    const period = getIntParam(config, 'period', 10, 1);
    const fastSc = 2 / (getIntParam(config, 'fast', 2, 1) + 1);
    const slowSc = 2 / (getIntParam(config, 'slow', 30, 1) + 1);
    const out: Num[] = new Array(data.length).fill(undefined);
    if (data.length <= period) return outputOf(data, pointsOf(out));
    let noise = 0;
    for (let j = 1; j <= period; j++) noise += Math.abs(data[j].close - data[j - 1].close);
    let kama = data[period - 1].close;
    for (let i = period; i < data.length; i++) {
      if (i > period) noise += Math.abs(data[i].close - data[i - 1].close) - Math.abs(data[i - period].close - data[i - period - 1].close);
      const change = Math.abs(data[i].close - data[i - period].close);
      const er = noise > 0 ? change / noise : 0;
      const sc = (er * (fastSc - slowSc) + slowSc) ** 2;
      kama += sc * (data[i].close - kama);
      out[i] = kama;
    }
    return outputOf(data, pointsOf(out));
  }
}
