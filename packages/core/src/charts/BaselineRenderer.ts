import type { DataSeries, ViewportState, Theme } from '@chart-lib/commons';
import type { ChartRendererInterface } from './ChartRenderer.js';

/**
 * Baseline chart: line chart split at a baseline price.
 * Above baseline = green (bullish), below = red (bearish).
 * Fill with gradient on each side.
 */
export class BaselineRenderer implements ChartRendererInterface {
  private baselinePrice: number | null = null;

  setBaseline(price: number): void {
    this.baselinePrice = price;
  }

  render(ctx: CanvasRenderingContext2D, data: DataSeries, viewport: ViewportState, theme: Theme): void {
    const { from, to } = viewport.visibleRange;
    if (from > to || data.length === 0) return;

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

    // Auto-detect baseline as average of visible range if not set
    const baseline = this.baselinePrice ?? this.computeBaseline(data, from, to);
    const baselineY = toY(baseline);
    const { chartRect } = viewport;

    // Collect points using pre-computed conversions
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = from; i <= to && i < data.length; i++) {
      xs.push(toX(i));
      ys.push(toY(data[i].close));
    }
    if (xs.length < 2) return;

    const lastIdx = xs.length - 1;

    // Fill above baseline (bullish) using Path2D
    ctx.save();
    const clipAbove = new Path2D();
    clipAbove.rect(chartRect.x, chartRect.y, chartRect.width, baselineY - chartRect.y);
    ctx.clip(clipAbove);

    const fillAbovePath = new Path2D();
    fillAbovePath.moveTo(xs[0], baselineY);
    for (let i = 0; i <= lastIdx; i++) fillAbovePath.lineTo(xs[i], ys[i]);
    fillAbovePath.lineTo(xs[lastIdx], baselineY);
    fillAbovePath.closePath();
    ctx.fillStyle = `${theme.candleUp}20`;
    ctx.fill(fillAbovePath);
    ctx.restore();

    // Fill below baseline (bearish) using Path2D
    ctx.save();
    const clipBelow = new Path2D();
    clipBelow.rect(chartRect.x, baselineY, chartRect.width, chartRect.y + chartRect.height - baselineY);
    ctx.clip(clipBelow);

    const fillBelowPath = new Path2D();
    fillBelowPath.moveTo(xs[0], baselineY);
    for (let i = 0; i <= lastIdx; i++) fillBelowPath.lineTo(xs[i], ys[i]);
    fillBelowPath.lineTo(xs[lastIdx], baselineY);
    fillBelowPath.closePath();
    ctx.fillStyle = `${theme.candleDown}20`;
    ctx.fill(fillBelowPath);
    ctx.restore();

    // Line segments batched by color using Path2D
    const abovePath = new Path2D();
    const belowPath = new Path2D();
    for (let i = 1; i <= lastIdx; i++) {
      const path = ys[i] <= baselineY ? abovePath : belowPath;
      path.moveTo(xs[i - 1], ys[i - 1]);
      path.lineTo(xs[i], ys[i]);
    }
    ctx.lineWidth = 2;
    ctx.strokeStyle = theme.candleUp;
    ctx.stroke(abovePath);
    ctx.strokeStyle = theme.candleDown;
    ctx.stroke(belowPath);

    // Baseline dashed line
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = theme.textSecondary;
    ctx.lineWidth = 1;
    const baselinePath = new Path2D();
    baselinePath.moveTo(chartRect.x, baselineY);
    baselinePath.lineTo(chartRect.x + chartRect.width, baselineY);
    ctx.stroke(baselinePath);
    ctx.setLineDash([]);
  }

  private computeBaseline(data: DataSeries, from: number, to: number): number {
    let sum = 0;
    let count = 0;
    for (let i = from; i <= to && i < data.length; i++) {
      sum += data[i].close;
      count++;
    }
    return count > 0 ? sum / count : 0;
  }
}
