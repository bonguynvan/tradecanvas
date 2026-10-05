import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { closes, emaOf, outputOf, smaOf, wmaOf, type Num } from '../math.js';

const KINDS = ['sma', 'ema', 'wma'] as const;
type Kind = (typeof KINDS)[number];

function averageOf(kind: Kind, src: readonly Num[], period: number): Num[] {
  if (kind === 'ema') return emaOf(src, period);
  if (kind === 'wma') return wmaOf(src, period);
  return smaOf(src, period);
}

/** Two or three moving averages of one kind (simple, exponential or weighted), each of its own length. */
abstract class MovingAverageSet extends IndicatorBase {
  /** The length parameters, in order, with their defaults. */
  protected abstract readonly lengths: readonly (readonly [string, number])[];

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const kind: Kind = (KINDS as readonly unknown[]).includes(config.params.type) ? (config.params.type as Kind) : 'sma';
    const src = closes(data);
    const lines = this.lengths.map(([key, fallback]) => averageOf(kind, src, getIntParam(config, key, fallback, 1)));
    const points = data.map((_, i): IndicatorValue | null => {
      const value: IndicatorValue = {};
      lines.forEach((line, k) => {
        const v = line[i];
        if (v !== undefined) value[`ma${k + 1}`] = v;
      });
      return Object.keys(value).length > 0 ? value : null;
    });
    return outputOf(data, points);
  }
}

/** Moving Average Double: a shorter and a longer average. */
export class MADoubleIndicator extends MovingAverageSet {
  protected readonly lengths = [['first', 20], ['second', 50]] as const;
  descriptor: IndicatorDescriptor = {
    id: 'madouble',
    name: 'Moving Average Double',
    placement: 'overlay',
    defaultConfig: { first: 20, second: 50, type: 'sma', source: 'close' },
    shortName: 'MA x2',
    inputs: { first: { min: 1 }, second: { min: 1 }, type: { options: KINDS }, source: { source: true } },
    plots: [
      { key: 'ma1', title: 'MA 1', color: 0 },
      { key: 'ma2', title: 'MA 2', color: 1 },
    ],
  };
}

/** Moving Average Triple: three averages, short to long. */
export class MATripleIndicator extends MovingAverageSet {
  protected readonly lengths = [['first', 10], ['second', 20], ['third', 50]] as const;
  descriptor: IndicatorDescriptor = {
    id: 'matriple',
    name: 'Moving Average Triple',
    placement: 'overlay',
    defaultConfig: { first: 10, second: 20, third: 50, type: 'sma', source: 'close' },
    shortName: 'MA x3',
    inputs: { first: { min: 1 }, second: { min: 1 }, third: { min: 1 }, type: { options: KINDS }, source: { source: true } },
    plots: [
      { key: 'ma1', title: 'MA 1', color: 0 },
      { key: 'ma2', title: 'MA 2', color: 1 },
      { key: 'ma3', title: 'MA 3', color: 2 },
    ],
  };
}
