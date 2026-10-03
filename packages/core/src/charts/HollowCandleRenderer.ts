import type { DataSeries, ViewportState, Theme } from '@tradecanvas/commons';
import type { ChartRendererInterface } from './ChartRenderer.js';
import { priceToYMapper } from '../viewport/ScaleMapping.js';
import { isDense, renderDenseBars } from './denseBars.js';
import { barColumns, inDevicePixels } from './pixelGrid.js';

/**
 * Hollow Candle: filled body when close < open (bearish), hollow when close >= open (bullish).
 * Color based on close vs previous close (not open).
 */
export class HollowCandleRenderer implements ChartRendererInterface {
  render(ctx: CanvasRenderingContext2D, data: DataSeries, viewport: ViewportState, theme: Theme): void {
    const { from, to } = viewport.visibleRange;
    const barWidth = viewport.barWidth;

    // Pre-compute coordinate conversion constants
    const barUnit = barWidth + viewport.barSpacing;
    const offsetX = -viewport.offset + viewport.chartRect.x + barWidth / 2;
    const { min, max } = viewport.priceRange;
    const priceRange = max - min;
    if (priceRange === 0) return;
    if (isDense(viewport)) {
      renderDenseBars(ctx, data, viewport, theme.candleUp, theme.candleDown);
      return;
    }
    const toY = priceToYMapper(viewport);

    inDevicePixels(ctx, (px) => {
      const { body, wick } = barColumns(barWidth, px.ratio);
      const bodyInset = (body - wick) / 2;
      // Batched by colour and kind: wicks and filled bodies as rects, hollow ones as outlines.
      const wicks = { up: new Path2D(), down: new Path2D() };
      const filled = { up: new Path2D(), down: new Path2D() };
      const hollow = { up: new Path2D(), down: new Path2D() };

      for (let i = from; i <= to && i < data.length; i++) {
        const bar = data[i];
        const side = i === 0 || bar.close >= data[i - 1].close ? 'up' : 'down';
        const wickLeft = px.left(i * barUnit + offsetX, wick);
        const left = wickLeft - bodyInset;
        const high = px.y(toY(bar.high));
        const low = px.y(toY(bar.low));
        const a = px.y(toY(bar.open));
        const b = px.y(toY(bar.close));
        const top = Math.min(a, b);
        const height = Math.max(Math.abs(b - a), wick);

        if (bar.close >= bar.open) {
          // Hollow: the wick stops at the body, which shows the background through.
          if (top > high) wicks[side].rect(wickLeft, high, wick, top - high);
          if (low > top + height) wicks[side].rect(wickLeft, top + height, wick, low - top - height);
          hollow[side].rect(left + wick / 2, top + wick / 2, Math.max(body - wick, 0), Math.max(height - wick, 0));
        } else {
          wicks[side].rect(wickLeft, Math.min(high, low), wick, Math.max(Math.abs(low - high), 1));
          filled[side].rect(left, top, body, height);
        }
      }

      for (const side of ['up', 'down'] as const) {
        const color = side === 'up' ? theme.candleUp : theme.candleDown;
        ctx.fillStyle = color;
        ctx.fill(wicks[side]);
        ctx.fill(filled[side]);
        ctx.strokeStyle = color;
        ctx.lineWidth = wick;
        ctx.stroke(hollow[side]);
      }
    });
  }
}
