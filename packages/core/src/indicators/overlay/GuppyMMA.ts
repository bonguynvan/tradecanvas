import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, IndicatorPlot } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { closes, emaOf, outputOf } from '../math.js';

const SHORT = [3, 5, 8, 10, 12, 15];
const LONG = [30, 35, 40, 45, 50, 60];

/**
 * Guppy Multiple Moving Average: six short EMAs (traders) and six long ones
 * (investors). A trend shows as the two groups apart, each fanned out.
 */
export class GuppyMMAIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'gmma',
    name: 'Guppy Multiple Moving Average',
    placement: 'overlay',
    defaultConfig: {},
    shortName: 'GMMA',
    plots: [
      ...SHORT.map((p): IndicatorPlot => ({ key: `s${p}`, title: `EMA ${p}`, color: 0 })),
      ...LONG.map((p): IndicatorPlot => ({ key: `l${p}`, title: `EMA ${p}`, color: 1 })),
    ],
  };

  calculate(data: DataSeries, _config: IndicatorConfig): IndicatorOutput {
    const src = closes(data);
    const lines = [...SHORT.map((p) => [`s${p}`, emaOf(src, p)] as const), ...LONG.map((p) => [`l${p}`, emaOf(src, p)] as const)];
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
