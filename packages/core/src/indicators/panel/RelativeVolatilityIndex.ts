import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam } from '../params.js';
import { closes, emaOf, outputOf, pointsOf, stdevOf, type Num } from '../math.js';

/**
 * Relative Volatility Index (Dorsey): an RSI of volatility. The standard
 * deviation of the closes counts up on a rising close and down on a falling
 * one; the share that came on rises, smoothed, in percent.
 */
export class RelativeVolatilityIndexIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'rvix',
    name: 'Relative Volatility Index',
    placement: 'panel',
    defaultConfig: { period: 10, smooth: 14 },
    shortName: 'RVI (vol)',
    inputs: { period: { min: 2 }, smooth: { min: 1 } },
    plots: [{ key: 'value', title: 'RVI', color: 0 }],
    levels: [80, 50, 20],
    scale: { min: 0, max: 100 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 10, 2);
    const smooth = getIntParam(config, 'smooth', 14, 1);
    const sd = stdevOf(closes(data), period);
    const up: Num[] = sd.map((v, i) => (v === undefined || i === 0 ? undefined : data[i].close > data[i - 1].close ? v : 0));
    const down: Num[] = sd.map((v, i) => (v === undefined || i === 0 ? undefined : data[i].close < data[i - 1].close ? v : 0));
    const avgUp = emaOf(up, smooth);
    const avgDown = emaOf(down, smooth);
    const rvi: Num[] = avgUp.map((u, i) => {
      const dn = avgDown[i];
      if (u === undefined || dn === undefined) return undefined;
      return u + dn === 0 ? 50 : (100 * u) / (u + dn);
    });
    return outputOf(data, pointsOf(rvi));
  }
}
