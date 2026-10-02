import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { closes, emaOf, outputOf, smaOf } from '../math.js';

/** Two moving averages, a fast and a slow one: their crossings are the classic trend signal. */
export class MACrossIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'macross',
    name: 'MA Cross',
    placement: 'overlay',
    defaultConfig: { fast: 9, slow: 21, type: 'sma', source: 'close' },
    shortName: 'MA Cross',
    inputs: { fast: { min: 1 }, slow: { min: 1 }, type: { options: ['sma', 'ema'] }, source: { source: true } },
    plots: [{ key: 'fast', title: 'Fast', color: 0 }, { key: 'slow', title: 'Slow', color: 1 }],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const average = config.params.type === 'ema' ? emaOf : smaOf;
    const src = closes(data);
    const fast = average(src, getIntParam(config, 'fast', 9, 1));
    const slow = average(src, getIntParam(config, 'slow', 21, 1));
    return outputOf(data, fast.map((f, i) => {
      const s = slow[i];
      if (f === undefined && s === undefined) return null;
      return { ...(f !== undefined ? { fast: f } : {}), ...(s !== undefined ? { slow: s } : {}) };
    }));
  }
}
