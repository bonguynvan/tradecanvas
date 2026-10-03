import type { DataSeries, ViewportState, Theme } from '@tradecanvas/commons';
import type { ChartRendererInterface } from './ChartRenderer.js';
import { priceToYMapper } from '../viewport/ScaleMapping.js';
import { isDense, renderDenseBars } from './denseBars.js';
import { barColumns, inDevicePixels } from './pixelGrid.js';

export class BarRenderer implements ChartRendererInterface {
  render(ctx: CanvasRenderingContext2D, data: DataSeries, viewport: ViewportState, theme: Theme): void {
    const { from, to } = viewport.visibleRange;
    const barWidth = viewport.barWidth;

    // Pre-compute constants
    const barUnit = barWidth + viewport.barSpacing;
    const offsetX = -viewport.offset + viewport.chartRect.x + barWidth / 2;
    const { min, max } = viewport.priceRange;
    const priceRange = max - min;
    if (priceRange === 0) return;
    if (isDense(viewport)) {
      renderDenseBars(ctx, data, viewport, theme.candleUp, theme.candleDown);
      return;
    }
    const toY = priceToYMapper(viewport);

    // Stem, open tick (left) and close tick (right) as rects on whole device pixels.
    inDevicePixels(ctx, (px) => {
      const { body, wick } = barColumns(barWidth, px.ratio);
      const tick = Math.max((body - wick) / 2, wick);
      const up = new Path2D();
      const down = new Path2D();
      for (let i = from; i <= to && i < data.length; i++) {
        const bar = data[i];
        const path = bar.close >= bar.open ? up : down;
        const stem = px.left(i * barUnit + offsetX, wick);
        const high = px.y(toY(bar.high));
        const low = px.y(toY(bar.low));
        path.rect(stem, Math.min(high, low), wick, Math.max(Math.abs(low - high), wick));
        path.rect(stem - tick, px.y(toY(bar.open)) - Math.floor(wick / 2), tick, wick);
        path.rect(stem + wick, px.y(toY(bar.close)) - Math.floor(wick / 2), tick, wick);
      }
      ctx.fillStyle = theme.candleUp;
      ctx.fill(up);
      ctx.fillStyle = theme.candleDown;
      ctx.fill(down);
    });
  }
}
