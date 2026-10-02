import type { DataSeries, ViewportState, Theme } from '@tradecanvas/commons';
import type { ChartRendererInterface } from './ChartRenderer.js';
import { priceToYMapper } from '../viewport/ScaleMapping.js';

export class HLCAreaRenderer implements ChartRendererInterface {
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

    const highPoints: { x: number; y: number }[] = [];
    const lowPoints: { x: number; y: number }[] = [];

    for (let i = from; i <= to && i < data.length; i++) {
      const x = toX(i);
      highPoints.push({ x, y: toY(data[i].high) });
      lowPoints.push({ x, y: toY(data[i].low) });
    }

    if (highPoints.length === 0) return;

    // Top colour at the high-price edge, whichever way up the scale is.
    const gradient = ctx.createLinearGradient(0, toY(max), 0, toY(min));
    gradient.addColorStop(0, theme.areaTopColor);
    gradient.addColorStop(1, theme.areaBottomColor);

    ctx.beginPath();
    ctx.moveTo(highPoints[0].x, highPoints[0].y);
    for (let i = 1; i < highPoints.length; i++) {
      ctx.lineTo(highPoints[i].x, highPoints[i].y);
    }
    for (let i = lowPoints.length - 1; i >= 0; i--) {
      ctx.lineTo(lowPoints[i].x, lowPoints[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = theme.lineColor;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    for (let i = from; i <= to && i < data.length; i++) {
      const x = toX(i);
      const y = toY(data[i].close);
      if (i === from) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}
