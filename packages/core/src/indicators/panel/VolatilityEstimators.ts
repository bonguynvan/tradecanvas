import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorValue } from '@tradecanvas/commons';
import { PointwiseIndicator } from '../PointwiseIndicator.js';
import { getIntParam, getNumberParam } from '../params.js';

interface VolatilityParams {
  period: number;
  annual: number;
}

const readParams = (config: IndicatorConfig): VolatilityParams => ({
  period: getIntParam(config, 'period', 10, 1),
  annual: Math.max(1, getNumberParam(config, 'annual', 365)),
});

const INPUTS = { period: { min: 1 }, annual: { label: 'Bars per year', min: 1 } } as const;

/**
 * Volatility O-H-L-C (Garman–Klass): each bar's variance read from its range
 * and body, 0.5·ln(H/L)² − (2·ln2 − 1)·ln(C/O)², averaged over `period`
 * bars and annualised by `annual` bars a year, in percent. It uses more of
 * each bar than the close-to-close estimate, so it settles sooner.
 */
export class VolatilityOHLCIndicator extends PointwiseIndicator<VolatilityParams> {
  descriptor: IndicatorDescriptor = {
    id: 'volohlc',
    name: 'Volatility O-H-L-C',
    placement: 'panel',
    defaultConfig: { period: 10, annual: 365 },
    shortName: 'Vol OHLC',
    inputs: INPUTS,
    plots: [{ key: 'value', title: 'Volatility', color: 0 }],
    scale: { min: 0 },
  };

  protected read(config: IndicatorConfig) {
    return readParams(config);
  }

  protected pointAt(data: DataSeries, i: number, { period, annual }: VolatilityParams): IndicatorValue | null {
    if (i < period - 1) return null;
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const { open, high, low, close } = data[j];
      if (!(open > 0 && high > 0 && low > 0 && close > 0)) return null;
      sum += 0.5 * Math.log(high / low) ** 2 - (2 * Math.LN2 - 1) * Math.log(close / open) ** 2;
    }
    return { value: 100 * Math.sqrt(Math.max(0, (sum / period) * annual)) };
  }
}

/**
 * Volatility Zero Trend Close-to-Close: the root mean square of the log
 * returns over `period` bars, taken about zero rather than their own mean
 * (a steady trend counts as volatility), annualised, in percent.
 */
export class VolatilityZeroTrendIndicator extends PointwiseIndicator<VolatilityParams> {
  descriptor: IndicatorDescriptor = {
    id: 'volzt',
    name: 'Volatility Zero Trend Close-to-Close',
    placement: 'panel',
    defaultConfig: { period: 10, annual: 365 },
    shortName: 'Vol ZT',
    inputs: INPUTS,
    plots: [{ key: 'value', title: 'Volatility', color: 0 }],
    scale: { min: 0 },
  };

  protected read(config: IndicatorConfig) {
    return readParams(config);
  }

  protected pointAt(data: DataSeries, i: number, { period, annual }: VolatilityParams): IndicatorValue | null {
    if (i < period) return null;
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const a = data[j - 1].close;
      const b = data[j].close;
      if (!(a > 0 && b > 0)) return null;
      sum += Math.log(b / a) ** 2;
    }
    return { value: 100 * Math.sqrt((sum / period) * annual) };
  }
}
