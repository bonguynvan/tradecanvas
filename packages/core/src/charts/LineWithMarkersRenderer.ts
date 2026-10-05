import type { DataSeries, ViewportState, Theme } from '@tradecanvas/commons';
import type { ChartRendererInterface } from './ChartRenderer.js';
import { priceToYMapper } from '../viewport/ScaleMapping.js';

export class LineWithMarkersRenderer implements ChartRendererInterface {
  render(ctx: CanvasRenderingContext2D, data: DataSeries, viewport: ViewportState, theme: Theme): void {
    const { from, to } = viewport.visibleRange;
    if (from > to || data.length === 0) return;

    const { min, max } = viewport.priceRange;
    const priceRange = max - min;
    if (priceRange === 0) return;

    const barUnit = viewport.barWidth + viewport.barSpacing;
    const offsetX = -viewport.offset + viewport.chartRect.x + viewport.barWidth / 2;

    const toX = (i: number) => i * barUnit + offsetX;
    const toY = priceToYMapper(viewport);

    ctx.beginPath();
    ctx.strokeStyle = theme.lineColor;
    ctx.lineWidth = theme.style?.series.lineWidth ?? 2;
    ctx.lineJoin = 'round';

    const points: { x: number; y: number }[] = [];

    for (let i = from; i <= to && i < data.length; i++) {
      const x = toX(i);
      const y = toY(data[i].close);
      points.push({ x, y });
      if (i === from) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    const markerRadius = Math.max(2, Math.min(4, viewport.barWidth * 0.3));
    const markerPath = new Path2D();
    for (const { x, y } of points) {
      markerPath.moveTo(x + markerRadius, y);
      markerPath.arc(x, y, markerRadius, 0, Math.PI * 2);
    }

    ctx.fillStyle = theme.lineColor;
    ctx.fill(markerPath);

    ctx.strokeStyle = theme.background;
    ctx.lineWidth = 1;
    ctx.stroke(markerPath);
  }
}
