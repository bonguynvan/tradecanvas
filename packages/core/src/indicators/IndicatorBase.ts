import type {
  IndicatorPlugin,
  IndicatorDescriptor,
  IndicatorConfig,
  IndicatorOutput,
  ResolvedIndicatorStyle,
  DataSeries,
  ViewportState,
  Point,
} from '@chart-lib/commons';
import { barIndexToX, priceToY } from '../viewport/ScaleMapping.js';

export abstract class IndicatorBase implements IndicatorPlugin {
  abstract descriptor: IndicatorDescriptor;
  abstract calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput;
  abstract render(
    ctx: CanvasRenderingContext2D,
    output: IndicatorOutput,
    viewport: ViewportState,
    style: ResolvedIndicatorStyle,
  ): void;

  protected drawLine(
    ctx: CanvasRenderingContext2D,
    points: Point[],
    color: string,
    lineWidth: number,
  ): void {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
  }

  protected drawBand(
    ctx: CanvasRenderingContext2D,
    upper: Point[],
    lower: Point[],
    fillColor: string,
  ): void {
    if (upper.length < 2 || lower.length < 2) return;
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
