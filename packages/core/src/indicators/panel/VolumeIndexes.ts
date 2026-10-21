import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { emaOf, outputOf, type Num } from '../math.js';

const START = 1000;

/**
 * An index from 1000 that takes the close's percent change only on the bars
 * whose volume moved the way `counts` says, with an EMA of it as a signal.
 */
abstract class VolumeIndex extends IndicatorBase {
  protected abstract counts(volume: number, previous: number): boolean;

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const index: Num[] = new Array(data.length).fill(undefined);
    let value = START;
    for (let i = 0; i < data.length; i++) {
      if (i > 0) {
        const prev = data[i - 1].close;
        if (prev !== 0 && this.counts(data[i].volume, data[i - 1].volume)) value *= data[i].close / prev;
      }
      index[i] = value;
    }
    const signal = emaOf(index, getIntParam(config, 'signal', 255, 1));
    const points: (IndicatorValue | null)[] = index.map((v, i) => (signal[i] !== undefined ? { value: v!, signal: signal[i] } : { value: v! }));
    return outputOf(data, points);
  }
}

/**
 * Negative Volume Index: follows the close only on bars when volume fell,
 * where the informed money is said to trade. Above its signal (an EMA,
 * 255 bars by default) leans bullish.
 */
export class NegativeVolumeIndexIndicator extends VolumeIndex {
  descriptor: IndicatorDescriptor = {
    id: 'nvi',
    name: 'Negative Volume Index',
    placement: 'panel',
    defaultConfig: { signal: 255 },
    shortName: 'NVI',
    plots: [
      { key: 'value', title: 'NVI', color: 0 },
      { key: 'signal', title: 'Signal', color: 1 },
    ],
  };

  protected counts(volume: number, previous: number): boolean {
    return volume < previous;
  }
}

/** Positive Volume Index: follows the close only on bars when volume rose, the crowd's days. */
export class PositiveVolumeIndexIndicator extends VolumeIndex {
  descriptor: IndicatorDescriptor = {
    id: 'pvi',
    name: 'Positive Volume Index',
    placement: 'panel',
    defaultConfig: { signal: 255 },
    shortName: 'PVI',
    plots: [
      { key: 'value', title: 'PVI', color: 0 },
      { key: 'signal', title: 'Signal', color: 1 },
    ],
  };

  protected counts(volume: number, previous: number): boolean {
    return volume > previous;
  }
}
