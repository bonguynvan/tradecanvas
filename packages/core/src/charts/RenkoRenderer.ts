import type { DataSeries, ViewportState, Theme } from '@chart-lib/commons';
import type { ChartRendererInterface } from './ChartRenderer.js';

/**
 * Renders Renko bricks. Data should already be transformed via toRenko().
 * Each brick is a solid colored rectangle (no wicks).
 */
export class RenkoRenderer implements ChartRendererInterface {
  render(ctx: CanvasRenderingContext2D, data: DataSeries, viewport: ViewportState, theme: Theme): void {
    const { from, to } = viewport.visibleRange;
    const barWidth = viewport.barWidth;
    const halfBar = barWidth / 2;

    // Pre-compute coordinate conversion constants
    const barUnit = barWidth + viewport.barSpacing;
    const offsetX = -viewport.offset + viewport.chartRect.x + halfBar;
    const { min, max } = viewport.priceRange;
    const priceRange = max - min;
    if (priceRange === 0) return;
    const chartY = viewport.chartRect.y;
    const priceScale = viewport.chartRect.height / priceRange;
    const toX = (i: number) => i * barUnit + offsetX;
    const toY = (price: number) => chartY + (max - price) * priceScale;

    // Batch fills and strokes by color using Path2D
    const upFillPath = new Path2D();
    const downFillPath = new Path2D();
    const upStrokePath = new Path2D();
    const downStrokePath = new Path2D();

    for (let i = from; i <= to && i < data.length; i++) {
      const bar = data[i];
      const x = toX(i);
      const isUp = bar.close >= bar.open;

      const topY = toY(Math.max(bar.open, bar.close));
      const bottomY = toY(Math.min(bar.open, bar.close));
      const height = Math.max(bottomY - topY, 1);

      const rectX = x - halfBar;
      if (isUp) {
        upFillPath.rect(rectX, topY, barWidth, height);
        upStrokePath.rect(rectX, topY, barWidth, height);
      } else {
        downFillPath.rect(rectX, topY, barWidth, height);
        downStrokePath.rect(rectX, topY, barWidth, height);
      }
    }

    // Draw all fills then all strokes, grouped by color
    ctx.fillStyle = theme.candleUp;
    ctx.fill(upFillPath);
    ctx.fillStyle = theme.candleDown;
    ctx.fill(downFillPath);

    ctx.lineWidth = 1;
    ctx.strokeStyle = theme.candleUp;
    ctx.stroke(upStrokePath);
    ctx.strokeStyle = theme.candleDown;
    ctx.stroke(downStrokePath);
  }
}
