import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { outputOf, type Num } from '../math.js';

/**
 * Ulcer Index: the depth and length of drawdowns — the root mean square of
 * each close's percent drop from the highest close of the `period` bars
 * before it, over `period` bars.
 */
export class UlcerIndexIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'ulcer',
    name: 'Ulcer Index',
    placement: 'panel',
    defaultConfig: { period: 14, source: 'close' },
    shortName: 'Ulcer',
    inputs: { period: { min: 1 }, source: { source: true } },
    plots: [{ key: 'value', title: 'Ulcer', color: 0 }],
    scale: { min: 0 },
  };

  /** Each bar's drawdown behind each output, so a tick redoes only the new ones. */
  private drawdowns = new WeakMap<IndicatorOutput, Num[]>();

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 14, 1);
    const dd: Num[] = data.map((_, i) => drawdownAt(data, i, period));
    const output = outputOf(data, data.map((_, i) => ulcerAt(dd, i, period)));
    this.drawdowns.set(output, dd);
    return output;
  }

  update(data: DataSeries, config: IndicatorConfig, prev: IndicatorOutput, from: number): IndicatorOutput | null {
    const dd = this.drawdowns.get(prev);
    if (!dd || !this.canResume(data, prev, from)) return null;
    const period = getIntParam(config, 'period', 14, 1);
    for (let i = from; i < data.length; i++) dd[i] = drawdownAt(data, i, period);
    dd.length = data.length;
    for (let i = from; i < data.length; i++) this.writePoint(prev, data, i, ulcerAt(dd, i, period));
    return prev;
  }
}

/** Bar `i`'s percent drop from the highest close of the `period` bars ending there. */
function drawdownAt(data: DataSeries, i: number, period: number): Num {
  if (i < period - 1) return undefined;
  let max = -Infinity;
  for (let j = i - period + 1; j <= i; j++) if (data[j].close > max) max = data[j].close;
  return max === 0 ? undefined : (100 * (data[i].close - max)) / max;
}

function ulcerAt(dd: readonly Num[], i: number, period: number): IndicatorValue | null {
  if (i < period - 1) return null;
  let sumSq = 0;
  for (let j = i - period + 1; j <= i; j++) {
    const d = dd[j];
    if (d === undefined) return null;
    sumSq += d * d;
  }
  return { value: Math.sqrt(sumSq / period) };
}
