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

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const volume = data.map((bar) => bar.volume);
    const fast = emaOf(volume, getIntParam(config, 'short', 5, 1));
    const slow = emaOf(volume, getIntParam(config, 'long', 10, 1));
    const out: Num[] = fast.map((f, i) => {
      const s = slow[i];
      return f === undefined || s === undefined || s === 0 ? undefined : (100 * (f - s)) / s;
    });
    return outputOf(data, pointsOf(out));
  }
}
