import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorValue } from '@tradecanvas/commons';
import { PointwiseIndicator } from '../PointwiseIndicator.js';
import { getIntParam } from '../params.js';

/**
 * Williams Fractals: a high above the `period` bars on each side (up
 * fractal, marked at the high) or a low below them (down fractal, at the
 * low). A fractal is known only `period` bars after it.
 */
export class WilliamsFractalsIndicator extends PointwiseIndicator<number> {
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

  protected read(config: IndicatorConfig): number {
    return getIntParam(config, 'period', 2, 1);
  }

  /** A change to a bar can make or unmake the fractal `n` bars before it. */
  protected lookback(n: number): number {
    return n;
  }

  protected pointAt(data: DataSeries, i: number, n: number): IndicatorValue | null {
    if (i < n || i > data.length - n - 1) return null;
    let up = true;
    let down = true;
    for (let j = i - n; j <= i + n && (up || down); j++) {
      if (j === i) continue;
      if (data[j].high >= data[i].high) up = false;
      if (data[j].low <= data[i].low) down = false;
    }
    if (!up && !down) return null;
    return { ...(up ? { up: data[i].high } : {}), ...(down ? { down: data[i].low } : {}) };
  }
}
