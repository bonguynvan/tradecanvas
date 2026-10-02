import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';

/**
 * Chaikin Oscillator = EMA(ADL, fast) - EMA(ADL, slow)
 * where ADL = cumulative Σ Money Flow Volume,
 * and Money Flow Volume = ((close - low) - (high - close)) / (high - low) * volume.
 */
export class ChaikinOscillatorIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'chaikinOsc',
    name: 'Chaikin Oscillator',
    placement: 'panel' as const,
    defaultConfig: { fast: 3, slow: 10 },
    shortName: 'Chaikin Osc',
    plots: [{ key: 'value', title: 'Chaikin', color: 0, kind: 'histogram', tone: 'sign', downColor: 1 }],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const fast = getIntParam(config, 'fast', 3, 1);
    const slow = getIntParam(config, 'slow', 10, 1);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    if (data.length < slow) return { values, series };

    const fastMult = 2 / (fast + 1);
    const slowMult = 2 / (slow + 1);

    let adl = 0;
    let emaFast = 0;
    let emaSlow = 0;

    for (let i = 0; i < data.length; i++) {
      const { high, low, close, volume } = data[i];
      const range = high - low;
      const mfm = range === 0 ? 0 : ((close - low) - (high - close)) / range;
      adl += mfm * volume;

      if (i === 0) {
        emaFast = adl;
        emaSlow = adl;
      } else {
        emaFast = (adl - emaFast) * fastMult + emaFast;
        emaSlow = (adl - emaSlow) * slowMult + emaSlow;
      }

      if (i >= slow - 1) {
        const osc = emaFast - emaSlow;
        const val: IndicatorValue = { value: osc, adl };
        values.set(data[i].time, val);
        series[i] = val;
      }
    }
    return { values, series };
  }
}
