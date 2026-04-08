import type {
  DrawingPlugin,
  DrawingDescriptor,
  DrawingState,
  DrawingStyle,
  Point,
  ViewportState,
  AnchorPoint,
  DataSeries,
} from '@chart-lib/commons';
import { barIndexToX, priceToY, xToBarIndex, yToPrice } from '../viewport/ScaleMapping.js';

export abstract class DrawingBase implements DrawingPlugin {
  abstract descriptor: DrawingDescriptor;

  abstract render(
    ctx: CanvasRenderingContext2D,
    state: DrawingState,
    viewport: ViewportState,
    selected: boolean,
  ): void;

  abstract hitTest(
    point: Point,
    state: DrawingState,
    viewport: ViewportState,
    tolerance: number,
  ): boolean;

  hitTestAnchor(
    point: Point,
    state: DrawingState,
    viewport: ViewportState,
    tolerance: number,
  ): number {
    for (let i = 0; i < state.anchors.length; i++) {
      const px = this.anchorToPixel(state.anchors[i], viewport);
      const dist = Math.hypot(point.x - px.x, point.y - px.y);
      if (dist <= tolerance) return i;
    }
    return -1;
  }

  protected anchorToPixel(anchor: AnchorPoint, viewport: ViewportState): Point {
    const x = barIndexToX(anchor.time, viewport);
    const y = priceToY(anchor.price, viewport);
    return { x, y };
  }

  protected pixelToAnchor(point: Point, viewport: ViewportState): AnchorPoint {
    const barIndex = xToBarIndex(point.x, viewport);
    const price = yToPrice(point.y, viewport);
    return { time: barIndex, price };
  }

  protected applyLineStyle(ctx: CanvasRenderingContext2D, style: DrawingStyle): void {
    ctx.strokeStyle = style.color;
    ctx.lineWidth = style.lineWidth;
    switch (style.lineStyle) {
      case 'dashed': ctx.setLineDash([6, 4]); break;
      case 'dotted': ctx.setLineDash([2, 2]); break;
      default: ctx.setLineDash([]); break;
    }
  }

  protected resetLineStyle(ctx: CanvasRenderingContext2D): void {
    ctx.setLineDash([]);
  }

  protected renderAnchorHandles(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState): void {
    const size = 4;
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = state.style.color;
    ctx.lineWidth = 1;
    for (const anchor of state.anchors) {
      const p = this.anchorToPixel(anchor, viewport);
      ctx.fillRect(p.x - size, p.y - size, size * 2, size * 2);
      ctx.strokeRect(p.x - size, p.y - size, size * 2, size * 2);
    }
  }

  protected distanceToLine(point: Point, p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(point.x - p1.x, point.y - p1.y);
    let t = ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const projX = p1.x + t * dx;
    const projY = p1.y + t * dy;
    return Math.hypot(point.x - projX, point.y - projY);
  }

  protected distanceToInfiniteLine(point: Point, p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) return Math.hypot(point.x - p1.x, point.y - p1.y);
    return Math.abs(dx * (p1.y - point.y) - dy * (p1.x - point.x)) / len;
  }
}
