import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { outputOf } from '../math.js';
import type { IndicatorValue } from '@tradecanvas/commons';

/**
 * Williams Fractals: a high above the `period` bars on each side (up
 * fractal, marked at the high) or a low below them (down fractal, at the
 * low). A fractal is known only `period` bars after it.
 */
export class WilliamsFractalsIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'fractals',
    name: 'Williams Fractals',
    placement: 'overlay',
    defaultConfig: { period: 2 },
    shortName: 'Fractals',
    inputs: { period: { min: 1, max: 10 } },
    plots: [
      { key: 'up', title: 'Up', color: 0, kind: 'dots' },
      { key: 'down', title: 'Down', color: 1, kind: 'dots' },
    ],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const n = getIntParam(config, 'period', 2, 1);
    const points: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    for (let i = n; i < data.length - n; i++) {
      let up = true;
      let down = true;
      for (let j = i - n; j <= i + n && (up || down); j++) {
        if (j === i) continue;
        if (data[j].high >= data[i].high) up = false;
        if (data[j].low <= data[i].low) down = false;
      }
      if (up || down) points[i] = { ...(up ? { up: data[i].high } : {}), ...(down ? { down: data[i].low } : {}) };
    }
    return outputOf(data, points);
  }
}
