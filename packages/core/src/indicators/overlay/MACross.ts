import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { closeMeanAt, closes, emaOf, outputOf } from '../math.js';

type Kind = 'sma' | 'ema';

/** The kinds of the fast and the slow line: both simple, both exponential, or a simple one against an exponential one. */
function kindsOf(config: IndicatorConfig): readonly [Kind, Kind] {
  if (config.params.type === 'ema') return ['ema', 'ema'];
  if (config.params.type === 'sma-ema') return ['sma', 'ema'];
  return ['sma', 'sma'];
}

/** Two moving averages, a fast and a slow one: their crossings are the classic trend signal. */
export class MACrossIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'macross',
    name: 'MA Cross',
    placement: 'overlay',
    defaultConfig: { fast: 9, slow: 21, type: 'sma', source: 'close' },
    shortName: 'MA Cross',
    inputs: { fast: { min: 1 }, slow: { min: 1 }, type: { options: ['sma', 'ema', 'sma-ema'] }, source: { source: true } },
    plots: [{ key: 'fast', title: 'Fast', color: 0 }, { key: 'slow', title: 'Slow', color: 1 }],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const [fastKind, slowKind] = kindsOf(config);
    const src = closes(data);
    const line = (kind: Kind, n: number) => (kind === 'ema' ? emaOf(src, n) : data.map((_, i) => closeMeanAt(data, i, n)));
    const fast = line(fastKind, getIntParam(config, 'fast', 9, 1));
    const slow = line(slowKind, getIntParam(config, 'slow', 21, 1));
    return outputOf(data, fast.map((f, i) => pair(f, slow[i])));
  }

  update(data: DataSeries, config: IndicatorConfig, prev: IndicatorOutput, from: number): IndicatorOutput | null {
    if (!this.canResume(data, prev, from)) return null;
    const [fastKind, slowKind] = kindsOf(config);
    const fastN = getIntParam(config, 'fast', 9, 1);
    const slowN = getIntParam(config, 'slow', 21, 1);
    let fast = prev.series![from - 1]?.fast;
    let slow = prev.series![from - 1]?.slow;
    // An exponential line goes on from its last value: none yet, start over.
    if ((fastKind === 'ema' && fast === undefined) || (slowKind === 'ema' && slow === undefined)) return null;
    for (let i = from; i < data.length; i++) {
      const close = data[i].close;
      fast = fastKind === 'ema' ? fast! + (2 / (fastN + 1)) * (close - fast!) : closeMeanAt(data, i, fastN);
      slow = slowKind === 'ema' ? slow! + (2 / (slowN + 1)) * (close - slow!) : closeMeanAt(data, i, slowN);
      this.writePoint(prev, data, i, pair(fast, slow));
    }
    return prev;
  }
}

function pair(fast: number | undefined, slow: number | undefined): IndicatorValue | null {
  if (fast === undefined && slow === undefined) return null;
  return { ...(fast !== undefined ? { fast } : {}), ...(slow !== undefined ? { slow } : {}) };
}
