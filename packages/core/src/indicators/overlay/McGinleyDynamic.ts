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
      const c = data[i].close;
      if (md === undefined) {
        md = seed[i];
      } else if (md > 0 && c > 0) {
        md += (c - md) / (period * (c / md) ** 4);
      } else {
        md = c;
      }
      out[i] = md;
    }
    return outputOf(data, pointsOf(out));
  }
}
