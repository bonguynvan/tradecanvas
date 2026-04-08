import type { DataSeries, ViewportState, Theme } from '@chart-lib/commons';
import type { ChartRendererInterface } from './ChartRenderer.js';

/**
 * Renders Kagi lines. Data should already be transformed via toKagi().
 * Thick lines (yang) for up, thin lines (yin) for down.
 */
export class KagiRenderer implements ChartRendererInterface {
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

    // Batch paths by direction: yang (up/thick) and yin (down/thin)
    const yangPath = new Path2D();
    const yinPath = new Path2D();

    for (let i = from; i <= to && i < data.length; i++) {
      const bar = data[i];
      const x = toX(i);
      const isUp = bar.close >= bar.open;

      const topY = toY(bar.high);
      const bottomY = toY(bar.low);

      // Vertical line
      const path = isUp ? yangPath : yinPath;
      path.moveTo(x, topY);
      path.lineTo(x, bottomY);

      // Horizontal connector to next bar
      if (i < to && i + 1 < data.length) {
        const nextX = toX(i + 1);
        const connectY = isUp ? bottomY : topY;
        path.moveTo(x, connectY);
        path.lineTo(nextX, connectY);
      }
    }

    // Draw yang (up) lines - thick
    ctx.strokeStyle = theme.candleUp;
    ctx.lineWidth = 3;
    ctx.stroke(yangPath);

    // Draw yin (down) lines - thin
    ctx.strokeStyle = theme.candleDown;
    ctx.lineWidth = 1;
    ctx.stroke(yinPath);
  }
}
