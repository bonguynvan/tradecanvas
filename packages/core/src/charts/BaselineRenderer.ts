import type { DataSeries, ViewportState, Theme } from '@tradecanvas/commons';
import type { ChartRendererInterface } from './ChartRenderer.js';
import { priceToYMapper } from '../viewport/ScaleMapping.js';

/** The fills above and below the baseline: the line's colour at an eighth (the `20` hex alpha it had). */
const BASELINE_FILL_ALPHA = 0x20 / 0xff;

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
    const toX = (i: number) => i * barUnit + offsetX;
    const toY = priceToYMapper(viewport);

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
    // "Above" means higher prices: up on screen, or down when the scale is inverted.
    const highEdgeY = toY(max);
    const lowEdgeY = toY(min);
    const clipAbove = new Path2D();
    clipAbove.rect(chartRect.x, Math.min(baselineY, highEdgeY), chartRect.width, Math.abs(highEdgeY - baselineY));
    ctx.clip(clipAbove);

    const fillAbovePath = new Path2D();
    fillAbovePath.moveTo(xs[0], baselineY);
    for (let i = 0; i <= lastIdx; i++) fillAbovePath.lineTo(xs[i], ys[i]);
    fillAbovePath.lineTo(xs[lastIdx], baselineY);
    fillAbovePath.closePath();
    // The colour as given, at an eighth: works for any way of writing it (a name, hsl(), oklch()).
    ctx.globalAlpha *= BASELINE_FILL_ALPHA;
    ctx.fillStyle = theme.candleUp;
    ctx.fill(fillAbovePath);
    ctx.restore();

    // Fill below baseline (bearish) using Path2D
    ctx.save();
    const clipBelow = new Path2D();
    clipBelow.rect(chartRect.x, Math.min(baselineY, lowEdgeY), chartRect.width, Math.abs(lowEdgeY - baselineY));
    ctx.clip(clipBelow);

    const fillBelowPath = new Path2D();
    fillBelowPath.moveTo(xs[0], baselineY);
    for (let i = 0; i <= lastIdx; i++) fillBelowPath.lineTo(xs[i], ys[i]);
    fillBelowPath.lineTo(xs[lastIdx], baselineY);
    fillBelowPath.closePath();
    ctx.globalAlpha *= BASELINE_FILL_ALPHA;
    ctx.fillStyle = theme.candleDown;
    ctx.fill(fillBelowPath);
    ctx.restore();

    // The line in a colour a side, a line per run on one side: round where
    // it bends, as a line chart is (pieces drawn apart left notches).
    const abovePath = new Path2D();
    const belowPath = new Path2D();
    let side: boolean | null = null;
    for (let i = 1; i <= lastIdx; i++) {
      // At or above the baseline price: up on screen, down when inverted.
      const above = viewport.invertScale ? ys[i] >= baselineY : ys[i] <= baselineY;
      const path = above ? abovePath : belowPath;
      if (above !== side) path.moveTo(xs[i - 1], ys[i - 1]);
      side = above;
      path.lineTo(xs[i], ys[i]);
    }
    ctx.save();
    ctx.lineWidth = theme.style?.series.lineWidth ?? 2;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = theme.candleUp;
    ctx.stroke(abovePath);
    ctx.strokeStyle = theme.candleDown;
    ctx.stroke(belowPath);
    ctx.restore();

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
