import type {
  DrawingPlugin,
  DrawingDescriptor,
  DrawingLevel,
  DrawingOptionValue,
  DrawingState,
  DrawingStyle,
  Point,
  ViewportState,
  AnchorPoint,
} from '@tradecanvas/commons';
import { drawingOption } from '@tradecanvas/commons';
import { priceToY, timeToX, xToTime, yToPrice } from '../viewport/ScaleMapping.js';

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

  /** One of the drawing's options (see `descriptor.options`), its default when unset. */
  protected option<T extends DrawingOptionValue>(state: DrawingState, key: string): T {
    return drawingOption<T>(this.descriptor.options, state.options, key);
  }

  /** The levels turned on, in order. */
  protected visibleLevels(state: DrawingState, key = 'levels'): DrawingLevel[] {
    return this.option<DrawingLevel[]>(state, key).filter((level) => level.visible);
  }

  /** The line from `p1` to `p2`, carried to the edge of the chart past either end when asked. */
  protected extendLine(p1: Point, p2: Point, viewport: ViewportState, left: boolean, right: boolean): [Point, Point] {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    if (len === 0 || (!left && !right)) return [p1, p2];
    const reach = Math.hypot(viewport.chartRect.width, viewport.chartRect.height) * 2;
    const ux = (dx / len) * reach;
    const uy = (dy / len) * reach;
    return [
      left ? { x: p1.x - ux, y: p1.y - uy } : p1,
      right ? { x: p2.x + ux, y: p2.y + uy } : p2,
    ];
  }

  /**
   * The price on the line through `a` and `b` at `time`: between the anchors,
   * or past `a` / past `b` when the line is extended that way. Null elsewhere,
   * or for a vertical line.
   */
  protected linePriceAt(a: AnchorPoint, b: AnchorPoint, time: number, pastA: boolean, pastB: boolean): number | null {
    if (a.time === b.time) return null;
    const t = (time - a.time) / (b.time - a.time); // 0 at a, 1 at b
    if ((t < 0 && !pastA) || (t > 1 && !pastB)) return null;
    return a.price + (b.price - a.price) * t;
  }

  protected anchorToPixel(anchor: AnchorPoint, viewport: ViewportState): Point {
    const x = timeToX(anchor.time, viewport);
    const y = priceToY(anchor.price, viewport);
    return { x, y };
  }

  protected pixelToAnchor(point: Point, viewport: ViewportState): AnchorPoint {
    const time = xToTime(point.x, viewport);
    const price = yToPrice(point.y, viewport);
    return { time, price };
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
