import type { DataSeries, ViewportState, Theme } from '@tradecanvas/commons';
import type { ChartRendererInterface } from './ChartRenderer.js';
import { priceToYMapper } from '../viewport/ScaleMapping.js';
import { isDense, renderDenseBars } from './denseBars.js';

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

    const upWickPath = new Path2D();
    const downWickPath = new Path2D();
    const upBodyPath = new Path2D();
    const downBodyPath = new Path2D();

    const toX = (i: number) => i * barUnit + offsetX;
    const toY = priceToYMapper(viewport);

    for (let i = from; i <= to && i < data.length; i++) {
      const bar = data[i];
      const x = toX(i);
      const highY = toY(bar.high);
      const lowY = toY(bar.low);
      const openY = toY(bar.open);
      const closeY = toY(bar.close);
      const isUp = bar.close >= bar.open;

      const volRatio = Math.max(0.2, bar.volume / maxVolume);
      const w = maxBarWidth * volRatio;
      const halfW = w / 2;

      const wickPath = isUp ? upWickPath : downWickPath;
      wickPath.moveTo(x, highY);
      wickPath.lineTo(x, lowY);

      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(Math.abs(closeY - openY), 1);
      const bodyPath = isUp ? upBodyPath : downBodyPath;
      bodyPath.rect(x - halfW, bodyTop, w, bodyHeight);
    }

    ctx.strokeStyle = theme.candleUpWick;
    ctx.lineWidth = 1;
    ctx.stroke(upWickPath);

    ctx.strokeStyle = theme.candleDownWick;
    ctx.stroke(downWickPath);

    ctx.fillStyle = theme.candleUp;
    ctx.fill(upBodyPath);

    ctx.fillStyle = theme.candleDown;
    ctx.fill(downBodyPath);
  }
}
