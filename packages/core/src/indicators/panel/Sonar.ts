import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { closes, emaOf, outputOf, type Num } from '../math.js';

/**
 * Sonar: how far an EMA of the close has moved over `lookback` bars,
 * EMA(close, period) now − the same EMA `lookback` bars ago, with an EMA of
 * that as its signal. Above zero the trend is up; the signal crossing gives
 * the turns.
 */
export class SonarIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'sonar',
    name: 'Sonar',
    placement: 'panel',
    defaultConfig: { period: 20, lookback: 9, signal: 9 },
    shortName: 'Sonar',
    plots: [
      { key: 'sonar', title: 'Sonar', color: 0 },
      { key: 'signal', title: 'Signal', color: 1 },
    ],
    levels: [0],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 20, 1);
    const lookback = getIntParam(config, 'lookback', 9, 1);
    const signalPeriod = getIntParam(config, 'signal', 9, 1);
    const ema = emaOf(closes(data), period);
    const sonar: Num[] = ema.map((v, i) => (v !== undefined && i >= lookback && ema[i - lookback] !== undefined ? v - ema[i - lookback]! : undefined));
    const signal = emaOf(sonar, signalPeriod);
    const points: (IndicatorValue | null)[] = sonar.map((s, i) => {
      if (s === undefined) return null;
      return signal[i] !== undefined ? { sonar: s, signal: signal[i] } : { sonar: s };
    });
    return outputOf(data, points);
  }
}
