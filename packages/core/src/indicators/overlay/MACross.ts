import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { closeMeanAt, closes, emaOf, outputOf } from '../math.js';

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
    const fastN = getIntParam(config, 'fast', 9, 1);
    const slowN = getIntParam(config, 'slow', 21, 1);
    if (config.params.type !== 'ema') {
      return outputOf(data, data.map((_, i) => pair(closeMeanAt(data, i, fastN), closeMeanAt(data, i, slowN))));
    }
    const src = closes(data);
    const fast = emaOf(src, fastN);
    const slow = emaOf(src, slowN);
    return outputOf(data, fast.map((f, i) => pair(f, slow[i])));
  }

  update(data: DataSeries, config: IndicatorConfig, prev: IndicatorOutput, from: number): IndicatorOutput | null {
    if (!this.canResume(data, prev, from)) return null;
    const fastN = getIntParam(config, 'fast', 9, 1);
    const slowN = getIntParam(config, 'slow', 21, 1);
    if (config.params.type !== 'ema') {
      for (let i = from; i < data.length; i++) {
        this.writePoint(prev, data, i, pair(closeMeanAt(data, i, fastN), closeMeanAt(data, i, slowN)));
      }
      return prev;
    }
    let fast = prev.series![from - 1]?.fast;
    let slow = prev.series![from - 1]?.slow;
    if (fast === undefined || slow === undefined) return null; // still warming up
    for (let i = from; i < data.length; i++) {
      fast += (2 / (fastN + 1)) * (data[i].close - fast);
      slow += (2 / (slowN + 1)) * (data[i].close - slow);
      this.writePoint(prev, data, i, { fast, slow });
    }
    return prev;
  }
}

function pair(fast: number | undefined, slow: number | undefined): IndicatorValue | null {
  if (fast === undefined && slow === undefined) return null;
  return { ...(fast !== undefined ? { fast } : {}), ...(slow !== undefined ? { slow } : {}) };
}
