import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam, getNumberParam } from '../params.js';
import { closes, emaOf, outputOf, smaOf } from '../math.js';

/** Moving Average Ribbon: four moving averages of the close, simple or (`exponential: 1`) exponential. */
export class MARibbonIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'maribbon',
    name: 'Moving Average Ribbon',
    placement: 'overlay',
    defaultConfig: { ma1: 20, ma2: 50, ma3: 100, ma4: 200, exponential: 0 },
    shortName: 'MA Ribbon',
    inputs: { ma1: { min: 1 }, ma2: { min: 1 }, ma3: { min: 1 }, ma4: { min: 1 }, exponential: { min: 0, max: 1 } },
    plots: [
      { key: 'ma1', title: 'MA 1', color: 0 },
      { key: 'ma2', title: 'MA 2', color: 1 },
      { key: 'ma3', title: 'MA 3', color: 2 },
      { key: 'ma4', title: 'MA 4', color: 3 },
    ],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const average = getNumberParam(config, 'exponential', 0) >= 1 ? emaOf : smaOf;
    const src = closes(data);
    const keys = ['ma1', 'ma2', 'ma3', 'ma4'] as const;
    const defaults = [20, 50, 100, 200];
    const lines = keys.map((key, k) => [key, average(src, getIntParam(config, key, defaults[k], 1))] as const);
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
