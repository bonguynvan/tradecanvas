import type { DataSeries, ViewportState, Theme } from '@chart-lib/commons';
import type { ChartRendererInterface } from './ChartRenderer.js';

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
    if (priceRange === 0) return;
    const chartY = viewport.chartRect.y;
    const priceScale = viewport.chartRect.height / priceRange;
    const toX = (i: number) => i * barUnit + offsetX;
    const toY = (price: number) => chartY + (max - price) * priceScale;

    const boxPixelHeight = Math.abs(this.boxSize * priceScale);
    const symbolSize = Math.min(halfBar * 0.8, boxPixelHeight * 0.8);
    const s = symbolSize * 0.5;

    // Batch X strokes and O strokes into separate Path2D objects
    const xPath = new Path2D();
    const oPath = new Path2D();

    for (let i = from; i <= to && i < data.length; i++) {
      const bar = data[i];
      const x = toX(i);
      const isX = bar.close >= bar.open; // X column (up)

      const topPrice = bar.high;
      const bottomPrice = bar.low;
      const numBoxes = Math.max(1, Math.round((topPrice - bottomPrice) / this.boxSize));

      for (let j = 0; j < numBoxes; j++) {
        const price = bottomPrice + (j + 0.5) * this.boxSize;
        const y = toY(price);

        if (isX) {
          // Draw X into path
          xPath.moveTo(x - s, y - s);
          xPath.lineTo(x + s, y + s);
          xPath.moveTo(x + s, y - s);
          xPath.lineTo(x - s, y + s);
        } else {
          // Draw O into path
          oPath.moveTo(x + s, y);
          oPath.arc(x, y, s, 0, Math.PI * 2);
        }
      }
    }

    // Stroke all X symbols at once
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = theme.candleUp;
    ctx.stroke(xPath);

    // Stroke all O symbols at once
    ctx.strokeStyle = theme.candleDown;
    ctx.stroke(oPath);
  }
}
