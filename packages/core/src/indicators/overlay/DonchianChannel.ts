import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { getIntParam } from '../params.js';
import { withAlpha } from '@tradecanvas/commons';
import { barIndexToX, priceToY } from '../../viewport/ScaleMapping.js';
import { plotLook } from '../plots.js';

export class DonchianChannelIndicator extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'donchian',
    name: 'Donchian Channel',
    placement: 'overlay' as const,
    defaultConfig: { period: 20 },
    shortName: 'DC',
    plots: [
      { key: 'upper', title: 'Upper', color: 0 },
      { key: 'middle', title: 'Basis', color: 1 },
      { key: 'lower', title: 'Lower', color: 0 },
    ],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = getIntParam(config, 'period', 20, 1);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);

    for (let i = period - 1; i < data.length; i++) {
      let high = -Infinity, low = Infinity;
      for (let j = i - period + 1; j <= i; j++) {
        if (data[j].high > high) high = data[j].high;
        if (data[j].low < low) low = data[j].low;
      }
      const val: IndicatorValue = {
        upper: high,
        middle: (high + low) / 2,
        lower: low,
      };
      values.set(data[i].time, val);
      series[i] = val;
    }
    return { values, series };
  }

  render(ctx: CanvasRenderingContext2D, output: IndicatorOutput, viewport: ViewportState, style: ResolvedIndicatorStyle): void {
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
      if (val.upper !== undefined) upperPts.push({ x, y: priceToY(val.upper, viewport) });
      if (val.middle !== undefined) middlePts.push({ x, y: priceToY(val.middle, viewport) });
      if (val.lower !== undefined) lowerPts.push({ x, y: priceToY(val.lower, viewport) });
    }

    this.drawBand(ctx, upperPts, lowerPts, withAlpha(style.colors[0], 0.08));
    this.drawLine(ctx, upperPts, style.colors[0], style.lineWidths[0], plotLook(style, 'upper', style.lineWidths[0]));
    this.drawLine(ctx, middlePts, style.colors[1] ?? '#7d8696', 1, plotLook(style, 'middle', 1));
    this.drawLine(ctx, lowerPts, style.colors[0], style.lineWidths[0], plotLook(style, 'lower', style.lineWidths[0]));
  }
}
