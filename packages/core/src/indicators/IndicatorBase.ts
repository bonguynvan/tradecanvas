import type {
  IndicatorPlugin,
  IndicatorDescriptor,
  IndicatorConfig,
  IndicatorOutput,
  IndicatorValue,
  ResolvedIndicatorStyle,
  DataSeries,
  ViewportState,
  Point,
} from '@tradecanvas/commons';
import { barIndexToX, priceToY } from '../viewport/ScaleMapping.js';
import { renderPlots } from './plots.js';
import { LinePen, fillDenseBand, isDenseLine } from './linePen.js';

export abstract class IndicatorBase implements IndicatorPlugin {
  abstract descriptor: IndicatorDescriptor;
  abstract calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput;

  /**
   * Whether `prev` can be extended incrementally from bar `from`: it must
   * cover `[0, from)`, not be longer than `data`, and its recomputed tail must
   * still sit on the same bar times — a last bar replaced with a different
   * timestamp would otherwise leave a stale key in `values`.
   */
  protected canResume(data: DataSeries, prev: IndicatorOutput, from: number): boolean {
    const series = prev.series;
    if (!series || from <= 0 || from > series.length || series.length > data.length) return false;
    for (let i = from; i < series.length; i++) {
      if (series[i] && !prev.values.has(data[i].time)) return false;
    }
    return true;
  }

  /** Store bar `i`'s recomputed point in both `series` and the `values` map. */
  protected writePoint(out: IndicatorOutput, data: DataSeries, i: number, val: IndicatorValue | null): void {
    out.series![i] = val;
    if (val) out.values.set(data[i].time, val);
    else out.values.delete(data[i].time);
  }
  /**
   * Draws the descriptor's `plots` with the viewport's value scale. Indicators
   * that draw more (bands, clouds, profiles) override it.
   */
  render(
    ctx: CanvasRenderingContext2D,
    output: IndicatorOutput,
    viewport: ViewportState,
    style: ResolvedIndicatorStyle,
  ): void {
    if (this.descriptor.plots) renderPlots(ctx, output, viewport, style, this.descriptor.plots);
  }

  protected drawLine(
    ctx: CanvasRenderingContext2D,
    points: Point[],
    color: string,
    lineWidth: number,
    /** The plot's own look (`plotLook`): hidden, it isn't drawn; dashed, it is. */
    look?: { visible: boolean; dash: readonly number[] },
  ): void {
    if (points.length < 2 || look?.visible === false) return;
    const dense = isDenseLine(points.length, points[0].x, points[points.length - 1].x);
    const pen = new LinePen(ctx, color, lineWidth, dense, look?.dash);
    for (const p of points) pen.add(p.x, p.y);
    pen.finish();
  }

  protected drawBand(
    ctx: CanvasRenderingContext2D,
    upper: Point[],
    lower: Point[],
    fillColor: string,
  ): void {
    if (upper.length < 2 || lower.length < 2) return;
    // Zoomed out: a span per pixel column instead of a polygon of thousands of points.
    if (upper.length === lower.length && isDenseLine(upper.length, upper[0].x, upper[upper.length - 1].x)) {
      fillDenseBand(ctx, upper.map((p) => p.x), upper.map((p) => p.y), lower.map((p) => p.y), fillColor);
      return;
    }
    ctx.beginPath();
    ctx.moveTo(upper[0].x, upper[0].y);
    for (let i = 1; i < upper.length; i++) {
      ctx.lineTo(upper[i].x, upper[i].y);
    }
    for (let i = lower.length - 1; i >= 0; i--) {
      ctx.lineTo(lower[i].x, lower[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
  }

  protected drawHistogram(
    ctx: CanvasRenderingContext2D,
    data: { x: number; y: number; baseY: number; color: string }[],
    barWidth: number,
  ): void {
    const halfBar = barWidth / 2;
    for (const bar of data) {
      ctx.fillStyle = bar.color;
      const top = Math.min(bar.y, bar.baseY);
      const height = Math.abs(bar.y - bar.baseY);
      ctx.fillRect(bar.x - halfBar, top, barWidth, Math.max(height, 1));
    }
  }

  protected valuesToPoints(
    output: IndicatorOutput,
    key: string,
    data: DataSeries,
    viewport: ViewportState,
  ): Point[] {
    const points: Point[] = [];
    const { from, to } = viewport.visibleRange;
    for (let i = from; i <= to && i < data.length; i++) {
      const val = output.values.get(data[i].time);
      if (val && val[key] !== undefined) {
        points.push({
          x: barIndexToX(i, viewport),
          y: priceToY(val[key]!, viewport),
        });
      }
    }
    return points;
  }
}
