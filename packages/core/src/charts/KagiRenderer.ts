import type { DataSeries, ViewportState, Theme } from '@tradecanvas/commons';
import type { ChartRendererInterface } from './ChartRenderer.js';
import { priceToYMapper } from '../viewport/ScaleMapping.js';

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
    const toX = (i: number) => i * barUnit + offsetX;
    const toY = priceToYMapper(viewport);

    // Batch paths by direction: yang (up/thick) and yin (down/thin)
    const yangPath = new Path2D();
    const yinPath = new Path2D();

    for (let i = from; i <= to && i < data.length; i++) {
      const bar = data[i];
      const x = toX(i);
      const isUp = bar.close >= bar.open;

      const topY = toY(bar.high);
      const bottomY = toY(bar.low);
      const connectY = isUp ? bottomY : topY;

      // The vertical line, then on along the connector to the next bar: one
      // line, round at its corner (two pieces drawn apart left a notch).
      const path = isUp ? yangPath : yinPath;
      path.moveTo(x, isUp ? topY : bottomY);
      path.lineTo(x, connectY);
      if (i < to && i + 1 < data.length) path.lineTo(toX(i + 1), connectY);
    }

    ctx.save();
    ctx.lineJoin = 'round';
    // Draw yang (up) lines - thick
    ctx.strokeStyle = theme.candleUp;
    ctx.lineWidth = 3;
    ctx.stroke(yangPath);

    // Draw yin (down) lines - thin
    ctx.strokeStyle = theme.candleDown;
    ctx.lineWidth = 1;
    ctx.stroke(yinPath);
    ctx.restore();
  }
}
