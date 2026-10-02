import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam, getNumberParam } from '../params.js';
import { outputOf, pointsOf, stdevOf, type Num } from '../math.js';

/**
 * Historical Volatility: the standard deviation of log returns over
 * `period` bars, annualised by √`annual` (bars per year: 365 for markets
 * that never close, 252 for stock days) and shown in percent.
 */
export class HistoricalVolatilityIndicator extends IndicatorBase {
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

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 10, 2);
    const annual = Math.max(1, getNumberParam(config, 'annual', 365));
    const returns: Num[] = data.map((bar, i) =>
      i > 0 && bar.close > 0 && data[i - 1].close > 0 ? Math.log(bar.close / data[i - 1].close) : undefined);
    const sd = stdevOf(returns, period);
    return outputOf(data, pointsOf(sd.map((s) => (s === undefined ? undefined : 100 * s * Math.sqrt(annual)))));
  }
}
