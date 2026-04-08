import type { DataSeries, ViewportState, Theme } from '@chart-lib/commons';
import type { ChartRendererInterface } from './ChartRenderer.js';

/**
 * Hollow Candle: filled body when close < open (bearish), hollow when close >= open (bullish).
 * Color based on close vs previous close (not open).
 */
export class HollowCandleRenderer implements ChartRendererInterface {
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

    // Path2D objects batched by color and type
    const upWickPath = new Path2D();
    const downWickPath = new Path2D();
    const upHollowRects: { x: number; y: number; w: number; h: number }[] = [];
    const downHollowRects: { x: number; y: number; w: number; h: number }[] = [];
    const upFilledPath = new Path2D();
    const downFilledPath = new Path2D();

    for (let i = from; i <= to && i < data.length; i++) {
      const bar = data[i];
      const x = toX(i);
      const isBullish = bar.close >= bar.open;
      const isRising = i === 0 || bar.close >= data[i - 1].close;

      const highY = toY(bar.high);
      const lowY = toY(bar.low);
      const openY = toY(bar.open);
      const closeY = toY(bar.close);
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(Math.abs(closeY - openY), 1);

      // Wick
      const wickPath = isRising ? upWickPath : downWickPath;
      wickPath.moveTo(x, highY);
      wickPath.lineTo(x, lowY);

      if (isBullish) {
        // Hollow body - collect rects for strokeRect batching
        const rects = isRising ? upHollowRects : downHollowRects;
        rects.push({ x: x - halfBar, y: bodyTop, w: barWidth, h: bodyHeight });
      } else {
        // Filled body
        const fillPath = isRising ? upFilledPath : downFilledPath;
        fillPath.rect(x - halfBar, bodyTop, barWidth, bodyHeight);
      }
    }

    // Draw wicks (lineWidth = 1)
    ctx.lineWidth = 1;
    ctx.strokeStyle = theme.candleUp;
    ctx.stroke(upWickPath);
    ctx.strokeStyle = theme.candleDown;
    ctx.stroke(downWickPath);

    // Draw filled bodies
    ctx.fillStyle = theme.candleUp;
    ctx.fill(upFilledPath);
    ctx.fillStyle = theme.candleDown;
    ctx.fill(downFilledPath);

    // Draw hollow bodies (strokeRect - must iterate but no per-bar beginPath/stroke)
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = theme.candleUp;
    for (const r of upHollowRects) {
      ctx.strokeRect(r.x, r.y, r.w, r.h);
    }
    ctx.strokeStyle = theme.candleDown;
    for (const r of downHollowRects) {
      ctx.strokeRect(r.x, r.y, r.w, r.h);
    }
  }
}
