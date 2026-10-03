import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { emaOf, highAt, lowAt, outputOf, type Num } from '../math.js';

/**
 * Stochastic Momentum Index (Blau): where the close sits against the middle
 * of the `period` bars' range, double-smoothed, in percent of half the range
 * (−100 to 100), with a signal line.
 */
export class StochasticMomentumIndexIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'smi',
    name: 'Stochastic Momentum Index',
    placement: 'panel',
    defaultConfig: { period: 10, smooth: 3, signal: 3 },
    shortName: 'SMI',
    inputs: { period: { min: 1 }, smooth: { min: 1 }, signal: { min: 1 } },
    plots: [
      { key: 'smi', title: 'SMI', color: 0 },
      { key: 'signal', title: 'Signal', color: 1 },
    ],
    levels: [40, -40],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 10, 1);
    const smooth = getIntParam(config, 'smooth', 3, 1);
    const signalP = getIntParam(config, 'signal', 3, 1);
    const distance: Num[] = new Array(data.length).fill(undefined);
    const range: Num[] = new Array(data.length).fill(undefined);
    for (let i = period - 1; i < data.length; i++) {
      const hh = highAt(data, i, period);
      const ll = lowAt(data, i, period);
      if (hh === undefined || ll === undefined) continue;
      distance[i] = data[i].close - (hh + ll) / 2;
      range[i] = hh - ll;
    }
    const d = emaOf(emaOf(distance, smooth), smooth);
    const r = emaOf(emaOf(range, smooth), smooth);
    const smi: Num[] = d.map((v, i) => {
      const half = r[i] === undefined ? undefined : r[i]! / 2;
      if (v === undefined || half === undefined) return undefined;
      return half === 0 ? 0 : Math.max(-100, Math.min(100, (100 * v) / half));
    });
    const signal = emaOf(smi, signalP);
    const points: (IndicatorValue | null)[] = smi.map((v, i) => {
      if (v === undefined) return null;
      const point: IndicatorValue = { smi: v };
      if (signal[i] !== undefined) point.signal = signal[i];
      return point;
    });
    return outputOf(data, points);
  }
}
