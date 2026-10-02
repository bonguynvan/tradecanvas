import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { closes, emaOf, outputOf, pointsOf, type Num } from '../math.js';

/**
 * McGinley Dynamic: a moving average that speeds up when price runs away
 * from it and slows when price falls back, by `(close / md)^4`. Starts from
 * an EMA of the same length.
 */
export class McGinleyDynamicIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'mcginley',
    name: 'McGinley Dynamic',
    placement: 'overlay',
    defaultConfig: { period: 14, source: 'close' },
    shortName: 'McGinley',
    inputs: { period: { min: 1 }, source: { source: true } },
    plots: [{ key: 'value', title: 'McGinley', color: 0 }],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 14, 1);
    const seed = emaOf(closes(data), period);
    const out: Num[] = new Array(data.length).fill(undefined);
    let md: number | undefined;
    for (let i = 0; i < data.length; i++) {
      md = md === undefined ? seed[i] : step(md, data[i].close, period);
      out[i] = md;
    }
    return outputOf(data, pointsOf(out));
  }

  update(data: DataSeries, config: IndicatorConfig, prev: IndicatorOutput, from: number): IndicatorOutput | null {
    if (!this.canResume(data, prev, from)) return null;
    let md = prev.series![from - 1]?.value;
    if (md === undefined) return null;
    const period = getIntParam(config, 'period', 14, 1);
    for (let i = from; i < data.length; i++) {
      md = step(md, data[i].close, period);
      this.writePoint(prev, data, i, { value: md });
    }
    return prev;
  }
}

function step(md: number, close: number, period: number): number {
  return md > 0 && close > 0 ? md + (close - md) / (period * (close / md) ** 4) : close;
}
