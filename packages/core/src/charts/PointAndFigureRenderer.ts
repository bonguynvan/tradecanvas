import type { DataSeries, ViewportState, Theme } from '@tradecanvas/commons';
import type { ChartRendererInterface } from './ChartRenderer.js';
import { priceToYMapper } from '../viewport/ScaleMapping.js';

/**
 * Renders Point & Figure chart. Data should be transformed via toPointAndFigure().
 * X for up columns, O for down columns.
 */
export class PointAndFigureRenderer implements ChartRendererInterface {
  private boxSize = 1;

  setBoxSize(size: number): void {
    this.boxSize = size;
  }

  render(ctx: CanvasRenderingContext2D, data: DataSeries, viewport: ViewportState, theme: Theme): void {
    const { from, to } = viewport.visibleRange;
    const barWidth = viewport.barWidth;
    const halfBar = barWidth / 2;

    // Pre-compute coordinate conversion constants
    const barUnit = barWidth + viewport.barSpacing;
    const offsetX = -viewport.offset + viewport.chartRect.x + halfBar;
    const { min, max } = viewport.priceRange;
    const priceRange = max - min;
    if (priceRange === 0 || !(this.boxSize > 0)) return;
    const priceScale = viewport.chartRect.height / priceRange;
    const toX = (i: number) => i * barUnit + offsetX;
    const toY = priceToYMapper(viewport);

    const boxPixelHeight = Math.abs(this.boxSize * priceScale);
    const symbolSize = Math.min(halfBar * 0.8, boxPixelHeight * 0.8);
    const s = symbolSize * 0.5;

    // X symbols as two strokes, each line of the X on its own (they cross,
    // and a stroke's pieces should not), and O symbols.
    const xFalling = new Path2D();
    const xRising = new Path2D();
    const oPath = new Path2D();

    for (let i = from; i <= to && i < data.length; i++) {
      const bar = data[i];
      const x = toX(i);
      const isX = bar.close >= bar.open; // X column (up)

      const topPrice = bar.high;
      const bottomPrice = bar.low;
      const numBoxes = Math.max(1, Math.round((topPrice - bottomPrice) / this.boxSize));
      // The boxes on screen only, and at most one a pixel: a box tiny for
      // the prices can't run a column to millions of symbols.
      const first = Math.max(0, Math.floor((min - bottomPrice) / this.boxSize) - 1);
      const last = Math.min(numBoxes - 1, Math.ceil((max - bottomPrice) / this.boxSize));
      const stride = Math.max(1, Math.ceil(1 / boxPixelHeight));

      for (let j = first; j <= last; j += stride) {
        const price = bottomPrice + (j + 0.5) * this.boxSize;
        const y = toY(price);

        if (isX) {
          xFalling.moveTo(x - s, y - s);
          xFalling.lineTo(x + s, y + s);
          xRising.moveTo(x + s, y - s);
          xRising.lineTo(x - s, y + s);
        } else {
          // Draw O into path
          oPath.moveTo(x + s, y);
          oPath.arc(x, y, s, 0, Math.PI * 2);
        }
      }
    }

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = theme.candleUp;
    ctx.stroke(xFalling);
    ctx.stroke(xRising);

    // Stroke all O symbols at once
    ctx.strokeStyle = theme.candleDown;
    ctx.stroke(oPath);
  }
}
