import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { closes, emaOf, highAt, lowAt, outputOf, pointsOf, smaOf, type Num } from '../math.js';

/**
 * Binary Wave: four trend tests, +1 when each says up and −1 when it says
 * down, added up from −4 to 4:
 * - the close above its `ma`-bar SMA;
 * - MACD (`fast`, `slow`) above its `signal` line;
 * - the `roc`-bar rate of change above 0;
 * - stochastic %K (`stoch` bars) above 50.
 * A tie (the close on its average, %K at 50) votes down. All four agreeing
 * marks a strong trend; the swings between show it waning.
 */
export class BinaryWaveIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'binarywave',
    name: 'Binary Wave',
    placement: 'panel',
    defaultConfig: { ma: 20, fast: 12, slow: 26, signal: 9, roc: 12, stoch: 14 },
    shortName: 'Binary Wave',
    plots: [{ key: 'value', title: 'Wave', color: 0, kind: 'step' }],
    scale: { min: -4, max: 4 },
    levels: [0],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const src = closes(data);
    const ma = smaOf(src, getIntParam(config, 'ma', 20, 1));
    const fast = emaOf(src, getIntParam(config, 'fast', 12, 1));
    const slow = emaOf(src, getIntParam(config, 'slow', 26, 1));
    const macd: Num[] = fast.map((f, i) => (f !== undefined && slow[i] !== undefined ? f - slow[i]! : undefined));
    const signal = emaOf(macd, getIntParam(config, 'signal', 9, 1));
    const roc = getIntParam(config, 'roc', 12, 1);
    const stoch = getIntParam(config, 'stoch', 14, 1);
    const vote = (yes: boolean) => (yes ? 1 : -1);

    const out: Num[] = data.map((bar, i) => {
      const hi = highAt(data, i, stoch);
      const lo = lowAt(data, i, stoch);
      if (ma[i] === undefined || macd[i] === undefined || signal[i] === undefined || i < roc || hi === undefined || lo === undefined) return undefined;
      const k = hi > lo ? ((bar.close - lo) / (hi - lo)) * 100 : 50;
      return vote(bar.close > ma[i]!) + vote(macd[i]! > signal[i]!) + vote(bar.close > src[i - roc]) + vote(k > 50);
    });
    return outputOf(data, pointsOf(out));
  }
}
