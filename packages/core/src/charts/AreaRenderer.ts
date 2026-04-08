import type { DataSeries, ViewportState, Theme } from '@chart-lib/commons';
import type { ChartRendererInterface } from './ChartRenderer.js';

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
    const chartY = viewport.chartRect.y;
    const chartH = viewport.chartRect.height;
    const priceScale = chartH / priceRange;
    const bottomY = chartY + chartH;

    // Build path in single pass
    const firstX = from * barUnit + offsetX;
    const firstY = chartY + (max - data[from].close) * priceScale;

    // Fill
    const gradient = ctx.createLinearGradient(0, chartY, 0, bottomY);
    gradient.addColorStop(0, theme.areaTopColor);
    gradient.addColorStop(1, theme.areaBottomColor);

    ctx.beginPath();
    ctx.moveTo(firstX, bottomY);
    ctx.lineTo(firstX, firstY);

    let lastX = firstX;
    for (let i = from + 1; i <= to && i < data.length; i++) {
      lastX = i * barUnit + offsetX;
      ctx.lineTo(lastX, chartY + (max - data[i].close) * priceScale);
    }

    ctx.lineTo(lastX, bottomY);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line on top
    ctx.beginPath();
    ctx.strokeStyle = theme.lineColor;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.moveTo(firstX, firstY);
    for (let i = from + 1; i <= to && i < data.length; i++) {
      ctx.lineTo(i * barUnit + offsetX, chartY + (max - data[i].close) * priceScale);
    }
    ctx.stroke();
  }
}
