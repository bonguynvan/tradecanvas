import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, IndicatorPlot } from '@tradecanvas/commons';
import { TC_SERIES_COLORS } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { closes, emaOf, outputOf, smaOf } from '../math.js';

/** Lines at most: more can't be told apart. */
export const MAX_RAINBOW_LINES = 20;

/**
 * Moving Average Rainbow: `count` moving averages of the close, the first
 * over `first` bars and each next one `step` bars longer (10, 20, 30… by
 * default), simple or (`exponential: 1`) exponential. In a trend the lines
 * fan out in order; tangled lines mean no trend. The lines take the palette's
 * colours in turn; `updateIndicatorStyle(id, { colors })` gives each its own.
 */
export class MARainbowIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'rainbow',
    name: 'Moving Average Rainbow',
    placement: 'overlay',
    defaultConfig: { first: 10, step: 10, count: 10, exponential: 0 },
    shortName: 'Rainbow',
    inputs: { first: { min: 1 }, step: { min: 1 }, count: { min: 1, max: MAX_RAINBOW_LINES }, exponential: { min: 0, max: 1 } },
    plots: Array.from({ length: MAX_RAINBOW_LINES }, (_, k): IndicatorPlot => ({
      key: `ma${k + 1}`,
      title: `MA ${k + 1}`,
      color: k % TC_SERIES_COLORS.length,
    })),
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const first = getIntParam(config, 'first', 10, 1);
    const step = getIntParam(config, 'step', 10, 1);
    const count = Math.min(MAX_RAINBOW_LINES, getIntParam(config, 'count', 10, 1));
    const average = getIntParam(config, 'exponential', 0, 0) >= 1 ? emaOf : smaOf;
    const src = closes(data);
    const lines = Array.from({ length: count }, (_, k) => [`ma${k + 1}`, average(src, first + k * step)] as const);
    const points: (IndicatorValue | null)[] = data.map((_, i) => {
      const point: IndicatorValue = {};
      let any = false;
      for (const [key, values] of lines) {
        if (values[i] !== undefined) {
          point[key] = values[i];
          any = true;
        }
      }
      return any ? point : null;
    });
    return outputOf(data, points);
  }
}
