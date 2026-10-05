import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { emaOf, outputOf, type Num } from '../math.js';

/**
 * SMI Ergodic (Blau): the bar-to-bar change of the close, smoothed twice by
 * EMAs (`long`, then `short`), over its absolute value smoothed the same way:
 * between −1 and 1. A `signal` EMA of it, and their gap as the oscillator.
 */
export class SMIErgodicIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'smiergodic',
    name: 'SMI Ergodic',
    placement: 'panel',
    defaultConfig: { short: 5, long: 20, signal: 5, source: 'close' },
    shortName: 'SMIIO',
    inputs: { short: { min: 1 }, long: { min: 1 }, signal: { min: 1 }, source: { source: true } },
    plots: [
      { key: 'oscillator', title: 'Oscillator', color: 2, kind: 'histogram', tone: 'sign', downColor: 3 },
      { key: 'indicator', title: 'Indicator', color: 0 },
      { key: 'signal', title: 'Signal', color: 1 },
    ],
    scale: { zero: true },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const short = getIntParam(config, 'short', 5, 1);
    const long = getIntParam(config, 'long', 20, 1);
    const change: Num[] = data.map((b, i) => (i === 0 ? undefined : b.close - data[i - 1].close));
    const num = emaOf(emaOf(change, long), short);
    const den = emaOf(emaOf(change.map((v) => (v === undefined ? undefined : Math.abs(v))), long), short);
    const indicator: Num[] = num.map((n, i) => (n === undefined || !den[i] ? undefined : n / den[i]!));
    const signal = emaOf(indicator, getIntParam(config, 'signal', 5, 1));
    const points = indicator.map((v, i): IndicatorValue | null => {
      if (v === undefined) return null;
      const s = signal[i];
      return s === undefined ? { indicator: v } : { indicator: v, signal: s, oscillator: v - s };
    });
    return outputOf(data, points);
  }
}
