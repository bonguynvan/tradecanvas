import type { DataSeries, ViewportState, Theme } from '@chart-lib/commons';
import type { ChartRendererInterface } from './ChartRenderer.js';

export class CandlestickRenderer implements ChartRendererInterface {
  render(ctx: CanvasRenderingContext2D, data: DataSeries, viewport: ViewportState, theme: Theme): void {
    const { from, to } = viewport.visibleRange;
    const barWidth = viewport.barWidth;
    const halfBar = barWidth / 2;

    // Pre-compute coordinate conversion constants (avoid function call overhead per bar)
    const barUnit = barWidth + viewport.barSpacing;
    const offsetX = -viewport.offset + viewport.chartRect.x + halfBar;
    const { min, max } = viewport.priceRange;
    const priceRange = max - min;
    if (priceRange === 0) return;
    const chartY = viewport.chartRect.y;
    const chartH = viewport.chartRect.height;
    const priceScale = chartH / priceRange;

    // Inline coordinate conversions
    const toX = (i: number) => i * barUnit + offsetX;
    const toY = (price: number) => chartY + (max - price) * priceScale;

    // Batch: collect up/down wicks and bodies into Path2D objects — single draw call per color
    const upWickPath = new Path2D();
    const downWickPath = new Path2D();
    const upBodyPath = new Path2D();
    const downBodyPath = new Path2D();

    for (let i = from; i <= to && i < data.length; i++) {
      const bar = data[i];
      const x = toX(i);
      const highY = toY(bar.high);
      const lowY = toY(bar.low);
      const openY = toY(bar.open);
      const closeY = toY(bar.close);
      const isUp = bar.close >= bar.open;

      // Wick
      const wickPath = isUp ? upWickPath : downWickPath;
      wickPath.moveTo(x, highY);
      wickPath.lineTo(x, lowY);

      // Body
      const bodyTop = isUp ? closeY : openY;
      const bodyHeight = Math.max(Math.abs(closeY - openY), 1);
      const bodyPath = isUp ? upBodyPath : downBodyPath;
      bodyPath.rect(x - halfBar, bodyTop, barWidth, bodyHeight);
    }

    // Draw all up wicks
    ctx.strokeStyle = theme.candleUpWick;
    ctx.lineWidth = 1;
    ctx.stroke(upWickPath);

    // Draw all down wicks
    ctx.strokeStyle = theme.candleDownWick;
    ctx.stroke(downWickPath);

    // Draw all up bodies
    ctx.fillStyle = theme.candleUp;
    ctx.fill(upBodyPath);

    // Draw all down bodies
    ctx.fillStyle = theme.candleDown;
    ctx.fill(downBodyPath);
  }
}
