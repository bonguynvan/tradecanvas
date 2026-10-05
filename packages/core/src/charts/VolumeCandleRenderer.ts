import type { DataSeries, ViewportState, Theme } from '@tradecanvas/commons';
import type { ChartRendererInterface } from './ChartRenderer.js';
import { priceToYMapper } from '../viewport/ScaleMapping.js';
import { isDense, renderDenseBars } from './denseBars.js';
import { barColumns, inDevicePixels } from './pixelGrid.js';

export class VolumeCandleRenderer implements ChartRendererInterface {
  render(ctx: CanvasRenderingContext2D, data: DataSeries, viewport: ViewportState, theme: Theme): void {
    const { from, to } = viewport.visibleRange;
    const { min, max } = viewport.priceRange;
    const priceRange = max - min;
    if (priceRange === 0 || from > to || data.length === 0) return;
    if (isDense(viewport)) {
      renderDenseBars(ctx, data, viewport, theme.candleUp, theme.candleDown);
      return;
    }

    const barUnit = viewport.barWidth + viewport.barSpacing;
    const offsetX = -viewport.offset + viewport.chartRect.x + viewport.barWidth / 2;
    const maxBarWidth = viewport.barWidth;

    let maxVolume = 0;
    for (let i = from; i <= to && i < data.length; i++) {
      if (data[i].volume > maxVolume) maxVolume = data[i].volume;
    }
    if (maxVolume === 0) maxVolume = 1;

    const toX = (i: number) => i * barUnit + offsetX;
    const toY = priceToYMapper(viewport);

    // Wicks and bodies on whole device pixels, as candles are, batched per colour.
    inDevicePixels(ctx, (px) => {
      const { wick } = barColumns(maxBarWidth, px.ratio);
      const upWick = new Path2D();
      const downWick = new Path2D();
      const upBody = new Path2D();
      const downBody = new Path2D();

      for (let i = from; i <= to && i < data.length; i++) {
        const bar = data[i];
        const isUp = bar.close >= bar.open;
        const wickLeft = px.left(toX(i), wick);
        const high = px.y(toY(bar.high));
        const low = px.y(toY(bar.low));
        (isUp ? upWick : downWick).rect(wickLeft, Math.min(high, low), wick, Math.max(Math.abs(low - high), 1));

        // The body's width follows the bar's volume, centred on the wick.
        const { body } = barColumns(maxBarWidth * Math.max(0.2, bar.volume / maxVolume), px.ratio);
        const a = px.y(toY(bar.open));
        const b = px.y(toY(bar.close));
        (isUp ? upBody : downBody).rect(wickLeft - (body - wick) / 2, Math.min(a, b), body, Math.max(Math.abs(b - a), wick));
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
