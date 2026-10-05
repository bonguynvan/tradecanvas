import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { closes, outputOf, pointsOf, smaOf } from '../math.js';

/** Price Oscillator: the short simple average less the long one, in price (the percentage one is PPO). */
export class PriceOscillatorIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'po',
    name: 'Price Oscillator',
    placement: 'panel',
    defaultConfig: { short: 10, long: 21, source: 'close' },
    shortName: 'PO',
    inputs: { short: { min: 1 }, long: { min: 1 }, source: { source: true } },
    plots: [{ key: 'value', title: 'PO', color: 0 }],
    scale: { zero: true },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const src = closes(data);
    const short = smaOf(src, getIntParam(config, 'short', 10, 1));
    const long = smaOf(src, getIntParam(config, 'long', 21, 1));
    return outputOf(data, pointsOf(short.map((s, i) => (s === undefined || long[i] === undefined ? undefined : s - long[i]!))));
  }
}
