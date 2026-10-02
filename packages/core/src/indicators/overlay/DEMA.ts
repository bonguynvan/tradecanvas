import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { closes, emaOf, outputOf, pointsOf, type Num } from '../math.js';

/** Double Exponential Moving Average (Mulloy): 2·EMA − EMA(EMA), with less lag than either. */
export class DEMAIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'dema',
    name: 'Double Exponential Moving Average',
    placement: 'overlay',
    defaultConfig: { period: 20, source: 'close' },
    shortName: 'DEMA',
    inputs: { period: { min: 1 }, source: { source: true } },
    plots: [{ key: 'value', title: 'DEMA', color: 0 }],
  };

  /** The two EMAs behind each output, so a tick extends them instead of starting over. */
  private emas = new WeakMap<IndicatorOutput, { e1: Num[]; e2: Num[] }>();

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 20, 1);
    const e1 = emaOf(closes(data), period);
    const e2 = emaOf(e1, period);
    const output = outputOf(data, pointsOf(e1.map((v, i) => (v !== undefined && e2[i] !== undefined ? 2 * v - e2[i]! : undefined))));
    this.emas.set(output, { e1, e2 });
    return output;
  }

  update(data: DataSeries, config: IndicatorConfig, prev: IndicatorOutput, from: number): IndicatorOutput | null {
    const state = this.emas.get(prev);
    if (!state || !this.canResume(data, prev, from)) return null;
    let e1 = state.e1[from - 1];
    let e2 = state.e2[from - 1];
    if (e1 === undefined || e2 === undefined) return null; // still warming up
    const k = 2 / (getIntParam(config, 'period', 20, 1) + 1);
    for (let i = from; i < data.length; i++) {
      e1 += k * (data[i].close - e1);
      e2 += k * (e1 - e2);
      state.e1[i] = e1;
      state.e2[i] = e2;
      this.writePoint(prev, data, i, { value: 2 * e1 - e2 });
    }
    return prev;
  }
}
