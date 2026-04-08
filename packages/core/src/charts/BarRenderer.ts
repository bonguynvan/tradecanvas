import type { DataSeries, ViewportState, Theme } from '@chart-lib/commons';
import type { ChartRendererInterface } from './ChartRenderer.js';

export class BarRenderer implements ChartRendererInterface {
  render(ctx: CanvasRenderingContext2D, data: DataSeries, viewport: ViewportState, theme: Theme): void {
    const { from, to } = viewport.visibleRange;
    const barWidth = viewport.barWidth;
    const halfBar = barWidth / 2;

    // Pre-compute constants
    const barUnit = barWidth + viewport.barSpacing;
    const offsetX = -viewport.offset + viewport.chartRect.x + halfBar;
    const { min, max } = viewport.priceRange;
    const priceRange = max - min;
    if (priceRange === 0) return;
    const chartY = viewport.chartRect.y;
    const priceScale = viewport.chartRect.height / priceRange;
    const toX = (i: number) => i * barUnit + offsetX;
    const toY = (price: number) => chartY + (max - price) * priceScale;

    // Batch by color using Path2D
    const upPath = new Path2D();
    const downPath = new Path2D();

    for (let i = from; i <= to && i < data.length; i++) {
      const bar = data[i];
      const x = toX(i);
      const isUp = bar.close >= bar.open;
      const path = isUp ? upPath : downPath;

      const highY = toY(bar.high);
      const lowY = toY(bar.low);
      const openY = toY(bar.open);
      const closeY = toY(bar.close);

      // Vertical line (high to low)
      path.moveTo(x, highY);
      path.lineTo(x, lowY);
      // Open tick (left)
      path.moveTo(x - halfBar, openY);
      path.lineTo(x, openY);
      // Close tick (right)
      path.moveTo(x, closeY);
      path.lineTo(x + halfBar, closeY);
    }

    ctx.lineWidth = 1;
    ctx.strokeStyle = theme.candleUp;
    ctx.stroke(upPath);
    ctx.strokeStyle = theme.candleDown;
    ctx.stroke(downPath);
  }
}
