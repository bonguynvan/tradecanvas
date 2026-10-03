import type { DataSeries, ViewportState, Theme } from '@tradecanvas/commons';
import type { ChartRendererInterface } from './ChartRenderer.js';
import { priceToYMapper } from '../viewport/ScaleMapping.js';
import { isDense, renderDenseBars } from './denseBars.js';
import { barColumns, inDevicePixels } from './pixelGrid.js';

export class CandlestickRenderer implements ChartRendererInterface {
  render(ctx: CanvasRenderingContext2D, data: DataSeries, viewport: ViewportState, theme: Theme): void {
    const { from, to } = viewport.visibleRange;
    const barWidth = viewport.barWidth;

    // Pre-compute coordinate conversion constants (avoid function call overhead per bar)
    const barUnit = barWidth + viewport.barSpacing;
    const offsetX = -viewport.offset + viewport.chartRect.x + barWidth / 2;
    const { min, max } = viewport.priceRange;
    if (max - min === 0) return;
    if (isDense(viewport)) {
      renderDenseBars(ctx, data, viewport, theme.candleUp, theme.candleDown);
      return;
    }

    const toY = priceToYMapper(viewport);

    // Wicks and bodies on whole device pixels, batched per colour: one fill each.
    inDevicePixels(ctx, (px) => {
      const { body, wick } = barColumns(barWidth, px.ratio);
      const bodyInset = (body - wick) / 2;
      const upWick = new Path2D();
      const downWick = new Path2D();
      const upBody = new Path2D();
      const downBody = new Path2D();

      for (let i = from; i <= to && i < data.length; i++) {
        const bar = data[i];
        const isUp = bar.close >= bar.open;
        const wickLeft = px.left(i * barUnit + offsetX, wick);
        const high = px.y(toY(bar.high));
        const low = px.y(toY(bar.low));
        (isUp ? upWick : downWick).rect(wickLeft, Math.min(high, low), wick, Math.max(Math.abs(low - high), 1));

        const a = px.y(toY(bar.open));
        const b = px.y(toY(bar.close));
        // A doji still gets a body one CSS pixel tall.
        (isUp ? upBody : downBody).rect(wickLeft - bodyInset, Math.min(a, b), body, Math.max(Math.abs(b - a), wick));
      }

      ctx.fillStyle = theme.candleUpWick;
      ctx.fill(upWick);
      ctx.fillStyle = theme.candleDownWick;
      ctx.fill(downWick);
      ctx.fillStyle = theme.candleUp;
      ctx.fill(upBody);
      ctx.fillStyle = theme.candleDown;
      ctx.fill(downBody);
    });
  }
}
