import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { emaOf, outputOf, pointsOf, type Num } from '../math.js';

/** Volume Oscillator: how far a short EMA of volume is above or below a long one, in percent. */
export class VolumeOscillatorIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'vo',
    name: 'Volume Oscillator',
    placement: 'panel',
    defaultConfig: { short: 5, long: 10 },
    shortName: 'Vol Osc',
    inputs: { short: { min: 1 }, long: { min: 1 } },
    plots: [{ key: 'value', title: 'Vol Osc', color: 0 }],
    levels: [0],
  };

  /** The two volume EMAs behind each output, so a tick extends them. */
  private emas = new WeakMap<IndicatorOutput, { fast: Num[]; slow: Num[] }>();

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const volume = data.map((bar) => bar.volume);
    const fast = emaOf(volume, getIntParam(config, 'short', 5, 1));
    const slow = emaOf(volume, getIntParam(config, 'long', 10, 1));
    const output = outputOf(data, pointsOf(fast.map((f, i) => oscillator(f, slow[i]))));
    this.emas.set(output, { fast, slow });
    return output;
  }

  update(data: DataSeries, config: IndicatorConfig, prev: IndicatorOutput, from: number): IndicatorOutput | null {
    const state = this.emas.get(prev);
    if (!state || !this.canResume(data, prev, from)) return null;
    let fast = state.fast[from - 1];
    let slow = state.slow[from - 1];
    if (fast === undefined || slow === undefined) return null; // still warming up
    const kf = 2 / (getIntParam(config, 'short', 5, 1) + 1);
    const ks = 2 / (getIntParam(config, 'long', 10, 1) + 1);
    for (let i = from; i < data.length; i++) {
      fast += kf * (data[i].volume - fast);
      slow += ks * (data[i].volume - slow);
      state.fast[i] = fast;
      state.slow[i] = slow;
      const value = oscillator(fast, slow);
      this.writePoint(prev, data, i, value === undefined ? null : { value });
    }
    return prev;
  }
}

function oscillator(fast: Num, slow: Num): Num {
  return fast === undefined || slow === undefined || slow === 0 ? undefined : (100 * (fast - slow)) / slow;
}
