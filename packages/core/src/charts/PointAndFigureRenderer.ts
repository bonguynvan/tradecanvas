import type { DataSeries, ViewportState, Theme } from '@tradecanvas/commons';
import type { ChartRendererInterface } from './ChartRenderer.js';
import { priceToYMapper } from '../viewport/ScaleMapping.js';

/** Boxes shorter than this (px) draw no X or O that reads: the column is drawn solid instead. */
const MIN_SYMBOL_BOX_PX = 3;
/** Share of the slot a column or a symbol takes. */
const SYMBOL_WIDTH_SHARE = 0.8;

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
    if (boxPixelHeight < MIN_SYMBOL_BOX_PX) {
      this.renderSolid(ctx, data, from, to, toX, toY, Math.max(1, barWidth * SYMBOL_WIDTH_SHARE), theme);
      return;
    }
    const symbolSize = Math.min(halfBar * SYMBOL_WIDTH_SHARE, boxPixelHeight * SYMBOL_WIDTH_SHARE);
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
      // The boxes on screen only: boxes are a few pixels high at least here
      // (smaller ones are drawn solid), so no more than the plot holds.
      const first = Math.max(0, Math.floor((min - bottomPrice) / this.boxSize) - 1);
      const last = Math.min(numBoxes - 1, Math.ceil((max - bottomPrice) / this.boxSize));

      for (let j = first; j <= last; j++) {
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

  /**
   * Each column as a bar from its low to its high, in the colour of its way:
   * with boxes a few pixels high or less, an X or an O would be a dot, and a
   * chart of them would read as empty.
   */
  private renderSolid(
    ctx: CanvasRenderingContext2D,
    data: DataSeries,
    from: number,
    to: number,
    toX: (i: number) => number,
    toY: (price: number) => number,
    width: number,
    theme: Theme,
  ): void {
    for (let i = Math.max(0, from); i <= to && i < data.length; i++) {
      const bar = data[i];
      const top = toY(bar.high);
      const bottom = toY(bar.low);
      ctx.fillStyle = bar.close >= bar.open ? theme.candleUp : theme.candleDown;
      ctx.fillRect(toX(i) - width / 2, Math.min(top, bottom), width, Math.max(1, Math.abs(bottom - top)));
    }
  }
}
