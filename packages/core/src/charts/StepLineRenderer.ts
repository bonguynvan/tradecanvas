import type { DataSeries, ViewportState, Theme } from '@tradecanvas/commons';
import type { ChartRendererInterface } from './ChartRenderer.js';
import { priceToYMapper } from '../viewport/ScaleMapping.js';

export class StepLineRenderer implements ChartRendererInterface {
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
    ctx.lineWidth = 2;
    ctx.lineJoin = 'miter';

    let prevY = 0;
    for (let i = from; i <= to && i < data.length; i++) {
      const x = toX(i);
      const y = toY(data[i].close);
      if (i === from) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, prevY);
        ctx.lineTo(x, y);
      }
      prevY = y;
    }
    ctx.stroke();
  }
}
