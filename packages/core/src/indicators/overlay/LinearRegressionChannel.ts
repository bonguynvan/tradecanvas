import type {
  DataSeries,
  IndicatorConfig,
  IndicatorOutput,
  IndicatorValue,
  ResolvedIndicatorStyle,
  ViewportState,
} from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { getIntParam, getNumberParam } from '../params.js';
import { withAlpha } from '@tradecanvas/commons';
import { barIndexToX, priceToY } from '../../viewport/ScaleMapping.js';

/**
 * Linear Regression Channel — fits a least-squares line over the trailing `period` closes
 * and offsets it by `stdDev` standard deviations of residuals to form upper/lower bands.
 */
export class LinearRegressionChannelIndicator extends IndicatorBase {
  descriptor = {
    id: 'lrc',
    name: 'Linear Regression Channel',
    placement: 'overlay' as const,
    defaultConfig: { period: 100, stdDev: 2 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 100, 2);
    const dev = getNumberParam(config, 'stdDev', 2);
    const values = new Map<number, IndicatorValue>();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);

    if (data.length < period) return { values, series };

    for (let i = period - 1; i < data.length; i++) {
      const start = i - period + 1;
      let sumX = 0;
      let sumY = 0;
      let sumXY = 0;
      let sumXX = 0;
      for (let k = 0; k < period; k++) {
        const x = k;
        const y = data[start + k].close;
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumXX += x * x;
      }
      const denom = period * sumXX - sumX * sumX;
      if (denom === 0) continue;
      const slope = (period * sumXY - sumX * sumY) / denom;
      const intercept = (sumY - slope * sumX) / period;

      let sse = 0;
      for (let k = 0; k < period; k++) {
        const fitted = slope * k + intercept;
        const resid = data[start + k].close - fitted;
        sse += resid * resid;
      }
      const sd = Math.sqrt(sse / period);
      const mid = slope * (period - 1) + intercept;
      const val: IndicatorValue = {
        middle: mid,
        upper: mid + dev * sd,
        lower: mid - dev * sd,
        slope,
      };
      values.set(data[i].time, val);
      series[i] = val;
    }
    return { values, series };
  }

  render(
    ctx: CanvasRenderingContext2D,
    output: IndicatorOutput,
    viewport: ViewportState,
    style: ResolvedIndicatorStyle,
  ): void {
    const series = output.series;
    if (!series) return;
    const { from, to } = viewport.visibleRange;

    const upperPts: { x: number; y: number }[] = [];
    const middlePts: { x: number; y: number }[] = [];
    const lowerPts: { x: number; y: number }[] = [];

    for (let i = from; i <= to && i < series.length; i++) {
      const val = series[i];
      if (!val) continue;
      const x = barIndexToX(i, viewport);
      if (val.middle !== undefined) middlePts.push({ x, y: priceToY(val.middle, viewport) });
      if (val.upper !== undefined) upperPts.push({ x, y: priceToY(val.upper, viewport) });
      if (val.lower !== undefined) lowerPts.push({ x, y: priceToY(val.lower, viewport) });
    }

    this.drawBand(ctx, upperPts, lowerPts, withAlpha(style.colors[0], 0.08));
    this.drawLine(ctx, upperPts, style.colors[0], style.lineWidths[0]);
    this.drawLine(ctx, middlePts, style.colors[1] ?? style.colors[0], style.lineWidths[0]);
    this.drawLine(ctx, lowerPts, style.colors[0], style.lineWidths[0]);
  }
}
