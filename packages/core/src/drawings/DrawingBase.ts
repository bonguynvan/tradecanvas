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
import { priceToY, resolveBarIndex, timeToX, xToTime, yToPrice } from '../viewport/ScaleMapping.js';

/**
 * How a line is straight on the chart: along `at` (a time's bar position, or
 * the time itself) and `value` (log price on a log scale, else price).
 */
export interface LineSpace {
  at(time: number): number;
  value(price: number): number;
  price(value: number): number;
}

const PLAIN_SPACE: LineSpace = { at: (time) => time, value: (price) => price, price: (value) => value };

/** The space lines are straight in on this chart; plain time and price without a viewport. */
export function lineSpace(viewport?: ViewportState): LineSpace {
  if (!viewport) return PLAIN_SPACE;
  const { min, max } = viewport.priceRange;
  const log = viewport.logScale === true && min > 0 && max > 0;
  return {
    at: (time) => resolveBarIndex(time, viewport),
    value: log ? (price) => Math.log(Math.max(price, Number.EPSILON)) : (price) => price,
    price: log ? Math.exp : (value) => value,
  };
}

/** How far `point` is from the segment `p1`–`p2` (px). */
export function distanceToSegment(point: Point, p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(point.x - p1.x, point.y - p1.y);
  const t = Math.max(0, Math.min(1, ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / lenSq));
  return Math.hypot(point.x - (p1.x + t * dx), point.y - (p1.y + t * dy));
}

/** Whether `point` is within `tolerance` of the line through `pts` (and back to the start, with `close`). */
export function nearPolyline(point: Point, pts: readonly Point[], tolerance: number, close = false): boolean {
  for (let i = 0; i < pts.length - 1; i++) {
    if (distanceToSegment(point, pts[i], pts[i + 1]) <= tolerance) return true;
  }
  return close && pts.length > 2 && distanceToSegment(point, pts[pts.length - 1], pts[0]) <= tolerance;
}

/** Whether a stored option value is of the kind its definition takes. */
function optionKindMatches(def: NonNullable<DrawingDescriptor['options']>[string], value: unknown): boolean {
  switch (def.kind) {
    case 'boolean': return typeof value === 'boolean';
    case 'number': return typeof value === 'number' && Number.isFinite(value);
    case 'levels': return Array.isArray(value);
    default: return typeof value === 'string';
  }
}

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
    // Options are cleaned on the way in (added, loaded, updated), so a read
    // runs every frame without copying; a value of the wrong kind still
    // falls back to the default. Callers must not change what they get.
    const def = this.descriptor.options?.[key];
    const own = state.options?.[key];
    if (!def) return own as T;
    return (own !== undefined && optionKindMatches(def, own) ? own : def.default) as T;
  }

  /** The levels turned on, in order. */
  protected visibleLevels(state: DrawingState, key = 'levels'): DrawingLevel[] {
    return this.option<DrawingLevel[]>(state, key).filter((level) => level.visible && Number.isFinite(level.value));
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
   * or for a vertical line. `space` is the one the line is straight in.
   */
  protected linePriceAt(
    a: AnchorPoint,
    b: AnchorPoint,
    time: number,
    pastA: boolean,
    pastB: boolean,
    space: LineSpace = PLAIN_SPACE,
  ): number | null {
    const value = this.lineValueAt(a, b, time, pastA, pastB, space);
    return value === null ? null : space.price(value);
  }

  /** `linePriceAt` in `space`'s values (log price on a log scale). */
  protected lineValueAt(
    a: AnchorPoint,
    b: AnchorPoint,
    time: number,
    pastA: boolean,
    pastB: boolean,
    space: LineSpace,
  ): number | null {
    const atA = space.at(a.time);
    const atB = space.at(b.time);
    if (atA === atB) return null;
    const t = (space.at(time) - atA) / (atB - atA); // 0 at a, 1 at b
    if (!Number.isFinite(t) || (t < 0 && !pastA) || (t > 1 && !pastB)) return null;
    const valueA = space.value(a.price);
    return valueA + (space.value(b.price) - valueA) * t;
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
    return distanceToSegment(point, p1, p2);
  }

  protected distanceToInfiniteLine(point: Point, p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) return Math.hypot(point.x - p1.x, point.y - p1.y);
    return Math.abs(dx * (p1.y - point.y) - dy * (p1.x - point.x)) / len;
  }
}
