import type { DataSeries, IndicatorConfig, IndicatorOutput, IndicatorValue, ResolvedIndicatorStyle, ViewportState } from '@chart-lib/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { withAlpha } from '@chart-lib/commons';
import { barIndexToX, priceToY } from '../../viewport/ScaleMapping.js';

export class DonchianChannelIndicator extends IndicatorBase {
  descriptor = {
    id: 'donchian',
    name: 'Donchian Channel',
    placement: 'overlay' as const,
    defaultConfig: { period: 20 },
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = config.params.period as number;
    const values = new Map<number, IndicatorValue>();
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
    this.drawLine(ctx, upperPts, style.colors[0], style.lineWidths[0]);
    this.drawLine(ctx, middlePts, style.colors[1] ?? '#787B86', 1);
    this.drawLine(ctx, lowerPts, style.colors[0], style.lineWidths[0]);
  }
}
