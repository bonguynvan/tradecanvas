import type { DataSeries, ViewportState, Theme } from '@tradecanvas/commons';
import type { ChartRendererInterface } from './ChartRenderer.js';
import { lttbVisibleIndices } from './downsample.js';
import { priceToYMapper } from '../viewport/ScaleMapping.js';

export class AreaRenderer implements ChartRendererInterface {
  render(ctx: CanvasRenderingContext2D, data: DataSeries, viewport: ViewportState, theme: Theme): void {
    const { from, to } = viewport.visibleRange;
    if (from > to || data.length === 0) return;

    // Pre-compute constants
    const barUnit = viewport.barWidth + viewport.barSpacing;
    const offsetX = -viewport.offset + viewport.chartRect.x + viewport.barWidth / 2;
    const { min, max } = viewport.priceRange;
    const priceRange = max - min;
    if (priceRange === 0) return;
    const toY = priceToYMapper(viewport);
    // The fill runs toward the low-price edge: the bottom, or the top when inverted.
    const baseY = toY(min);

    // LTTB-downsample the visible range when it far exceeds the pixel width;
    // a no-op for normally-zoomed data. Used for both the fill and the line.
    const indices = lttbVisibleIndices(from, to, data.length, viewport.chartRect.width, (i) => data[i].close);
    if (indices.length === 0) return;

    const firstI = indices[0];
    const firstX = firstI * barUnit + offsetX;
    const firstY = toY(data[firstI].close);

    // Fill
    const gradient = ctx.createLinearGradient(0, toY(max), 0, baseY);
    gradient.addColorStop(0, theme.areaTopColor);
    gradient.addColorStop(1, theme.areaBottomColor);

    ctx.beginPath();
    ctx.moveTo(firstX, baseY);
    ctx.lineTo(firstX, firstY);

    let lastX = firstX;
    for (let k = 1; k < indices.length; k++) {
      const i = indices[k];
      lastX = i * barUnit + offsetX;
      ctx.lineTo(lastX, toY(data[i].close));
    }

    ctx.lineTo(lastX, baseY);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line on top
    ctx.beginPath();
    ctx.strokeStyle = theme.lineColor;
    ctx.lineWidth = theme.style?.series.lineWidth ?? 2;
    ctx.lineJoin = 'round';
    ctx.moveTo(firstX, firstY);
    for (let k = 1; k < indices.length; k++) {
      const i = indices[k];
      ctx.lineTo(i * barUnit + offsetX, toY(data[i].close));
    }
    ctx.stroke();
  }
}
