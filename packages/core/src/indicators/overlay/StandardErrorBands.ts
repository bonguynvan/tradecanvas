import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam, getNumberParam } from '../params.js';
import { outputOf, regressionAt, smaOf, type Num } from '../math.js';

/**
 * Standard Error Bands (Andersen): the least-squares line's value at each bar,
 * with bands `mult` standard errors either side, each averaged over `smooth`
 * bars.
 */
export class StandardErrorBandsIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'seb',
    name: 'Standard Error Bands',
    placement: 'overlay',
    defaultConfig: { period: 21, mult: 2, smooth: 3 },
    shortName: 'SEB',
    inputs: { period: { min: 3 }, mult: { min: 0, step: 0.1 }, smooth: { min: 1 } },
    plots: [
      { key: 'upper', title: 'Upper', color: 1 },
      { key: 'middle', title: 'Middle', color: 0 },
      { key: 'lower', title: 'Lower', color: 1 },
    ],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 21, 3);
    const mult = getNumberParam(config, 'mult', 2);
    const smooth = getIntParam(config, 'smooth', 3, 1);
    const middle: Num[] = new Array(data.length).fill(undefined);
    const upper: Num[] = new Array(data.length).fill(undefined);
    const lower: Num[] = new Array(data.length).fill(undefined);
    for (let i = 0; i < data.length; i++) {
      const fit = regressionAt(data, i, period);
      if (!fit) continue;
      middle[i] = fit.end;
      upper[i] = fit.end + mult * fit.stdErr;
      lower[i] = fit.end - mult * fit.stdErr;
    }
    const m = smaOf(middle, smooth);
    const u = smaOf(upper, smooth);
    const l = smaOf(lower, smooth);
    const points: (IndicatorValue | null)[] = m.map((v, i) =>
      v === undefined || u[i] === undefined || l[i] === undefined ? null : { middle: v, upper: u[i], lower: l[i] });
    return outputOf(data, points);
  }
}
