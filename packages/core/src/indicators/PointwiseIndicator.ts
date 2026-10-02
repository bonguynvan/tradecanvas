import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from './IndicatorBase.js';
import { outputOf } from './math.js';

/**
 * An indicator whose value at a bar comes from a window of bars around it and
 * nothing else (no running state). A live tick then only recomputes the bars
 * the change can reach: those from `from` on, and `lookback` bars before it.
 */
export abstract class PointwiseIndicator<P> extends IndicatorBase {
  /**
   * The bar times each output was computed on. Bars without a point leave no
   * trace in the output, so this is what tells a replaced bar (a new time)
   * from a ticked one.
   */
  private times = new WeakMap<IndicatorOutput, number[]>();

  /** Read the parameters once per computation. */
  protected abstract read(config: IndicatorConfig): P;

  /** The point at bar `i`, or null where there is none. */
  protected abstract pointAt(data: DataSeries, i: number, params: P): IndicatorValue | null;

  /** How many earlier bars a change at a bar can alter (a fractal is decided by the bars after it). */
  protected lookback(_params: P): number {
    return 0;
  }

  revisesBefore(config: IndicatorConfig): number {
    return this.lookback(this.read(config));
  }

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const params = this.read(config);
    const points: (IndicatorValue | null)[] = new Array(data.length);
    for (let i = 0; i < data.length; i++) points[i] = this.pointAt(data, i, params);
    const output = outputOf(data, points);
    this.times.set(output, data.map((bar) => bar.time));
    return output;
  }

  update(data: DataSeries, config: IndicatorConfig, prev: IndicatorOutput, from: number): IndicatorOutput | null {
    const times = this.times.get(prev);
    if (!times || !this.canResume(data, prev, from)) return null;
    for (let i = from; i < times.length && i < data.length; i++) if (times[i] !== data[i].time) return null;
    const params = this.read(config);
    for (let i = Math.max(0, from - this.lookback(params)); i < data.length; i++) {
      this.writePoint(prev, data, i, this.pointAt(data, i, params));
    }
    times.length = data.length;
    for (let i = from; i < data.length; i++) times[i] = data[i].time;
    return prev;
  }
}
