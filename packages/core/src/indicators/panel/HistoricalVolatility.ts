import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorValue } from '@tradecanvas/commons';
import { PointwiseIndicator } from '../PointwiseIndicator.js';
import { getIntParam, getNumberParam } from '../params.js';

/**
 * Historical Volatility: the standard deviation of log returns over
 * `period` bars, annualised by √`annual` (bars per year: 365 for markets
 * that never close, 252 for stock days) and shown in percent.
 */
export class HistoricalVolatilityIndicator extends PointwiseIndicator<{ period: number; annual: number }> {
  descriptor: IndicatorDescriptor = {
    id: 'hv',
    name: 'Historical Volatility',
    placement: 'panel',
    defaultConfig: { period: 10, annual: 365, source: 'close' },
    shortName: 'HV',
    inputs: { period: { min: 2 }, annual: { label: 'Bars per year', min: 1 }, source: { source: true } },
    plots: [{ key: 'value', title: 'HV', color: 0 }],
    scale: { min: 0 },
  };

  protected read(config: IndicatorConfig) {
    return { period: getIntParam(config, 'period', 10, 2), annual: Math.max(1, getNumberParam(config, 'annual', 365)) };
  }

  protected pointAt(data: DataSeries, i: number, { period, annual }: { period: number; annual: number }): IndicatorValue | null {
    if (i < period) return null;
    let sum = 0;
    let sumSq = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const a = data[j - 1].close;
      const b = data[j].close;
      if (!(a > 0 && b > 0)) return null;
      const r = Math.log(b / a);
      sum += r;
      sumSq += r * r;
    }
    const mean = sum / period;
    return { value: 100 * Math.sqrt(Math.max(0, sumSq / period - mean * mean)) * Math.sqrt(annual) };
  }
}
