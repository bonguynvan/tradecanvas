import type { DataSeries, ViewportState, Theme } from '@tradecanvas/commons';
import type { ChartRendererInterface } from './ChartRenderer.js';
import { lttbVisibleIndices } from './downsample.js';

export class LineRenderer implements ChartRendererInterface {
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
    const priceScale = viewport.chartRect.height / priceRange;

    ctx.beginPath();
    ctx.strokeStyle = theme.lineColor;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';

    // LTTB-downsample the visible range when it far exceeds the pixel width so
    // 100k-bar line charts stay smooth; a no-op for normally-zoomed data.
    const indices = lttbVisibleIndices(from, to, data.length, viewport.chartRect.width, (i) => data[i].close);
    let started = false;
    for (const i of indices) {
      const x = i * barUnit + offsetX;
      const y = chartY + (max - data[i].close) * priceScale;
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}
