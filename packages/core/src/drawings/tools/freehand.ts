import type { DrawingDescriptor, DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase, nearPolyline } from '../DrawingBase.js';

/** Segments a curve or an arc is drawn and hit-tested with. */
const CURVE_STEPS = 48;
const ARROW_HEAD = 10;

/** Draw a line through `pts`, smoothed: each corner rounded through the midpoints of its segments. */
function strokeSmooth(ctx: CanvasRenderingContext2D, pts: readonly Point[]): void {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  if (pts.length === 2) {
    ctx.lineTo(pts[1].x, pts[1].y);
  } else {
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2;
      const my = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last.x, last.y);
  }
  ctx.stroke();
}

function strokePolyline(ctx: CanvasRenderingContext2D, pts: readonly Point[], close = false): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  if (close) ctx.closePath();
}

/** An open arrow head at `to`, coming from `from`. */
export function drawArrowHead(ctx: CanvasRenderingContext2D, from: Point, to: Point, size = ARROW_HEAD): void {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  ctx.beginPath();
  ctx.moveTo(to.x - size * Math.cos(angle - Math.PI / 6), to.y - size * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(to.x, to.y);
  ctx.lineTo(to.x - size * Math.cos(angle + Math.PI / 6), to.y - size * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
}

/** Whether `point` is inside the polygon `pts` (even-odd rule). */
export function insidePolygon(point: Point, pts: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i];
    const b = pts[j];
    if ((a.y > point.y) !== (b.y > point.y) && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** A freehand stroke: press and drag. It moves as a whole; its points have no handles. */
export class BrushTool extends DrawingBase {
  descriptor: DrawingDescriptor = { type: 'brush', name: 'Brush', requiredAnchors: 2, creation: 'freehand' };

  /** How thick the stroke is drawn and how see-through. */
  protected stroke(state: DrawingState): { width: number; alpha: number } {
    return { width: state.style.lineWidth, alpha: 1 };
  }

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    const pts = state.anchors.map((a) => this.anchorToPixel(a, viewport));
    const { width, alpha } = this.stroke(state);
    this.applyLineStyle(ctx, state.style);
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = alpha;
    strokeSmooth(ctx, pts);
    ctx.globalAlpha = 1;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    this.resetLineStyle(ctx);
    if (selected) this.renderBounds(ctx, state, pts);
  }

  /** A selected stroke shows the box around it instead of hundreds of handles. */
  private renderBounds(ctx: CanvasRenderingContext2D, state: DrawingState, pts: readonly Point[]): void {
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const pad = this.stroke(state).width / 2 + 3;
    ctx.strokeStyle = state.style.color;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) - Math.min(...xs) + pad * 2, Math.max(...ys) - Math.min(...ys) + pad * 2);
    ctx.setLineDash([]);
  }

  hitTestAnchor(): number {
    return -1;
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    const pts = state.anchors.map((a) => this.anchorToPixel(a, viewport));
    return nearPolyline(point, pts, tolerance + this.stroke(state).width / 2);
  }
}

/** A broad see-through marker stroke, for highlighting bars. */
export class HighlighterTool extends BrushTool {
  override descriptor: DrawingDescriptor = { type: 'highlighter', name: 'Highlighter', requiredAnchors: 2, creation: 'freehand' };

  protected override stroke(state: DrawingState): { width: number; alpha: number } {
    return { width: Math.max(10, state.style.lineWidth * 8), alpha: 0.3 };
  }
}

/** A line through points clicked one by one, with an arrow at the end; a double-click or Enter ends it. */
export class PathTool extends DrawingBase {
  descriptor = {
    type: 'path' as const,
    name: 'Path',
    requiredAnchors: 2,
    creation: 'path' as const,
    options: {
      arrowEnd: { kind: 'boolean' as const, label: 'Arrow at the end', default: true },
    },
  };

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    const pts = state.anchors.map((a) => this.anchorToPixel(a, viewport));
    this.applyLineStyle(ctx, state.style);
    ctx.lineJoin = 'round';
    strokePolyline(ctx, pts);
    ctx.stroke();
    this.resetLineStyle(ctx);
    if (this.option<boolean>(state, 'arrowEnd')) drawArrowHead(ctx, pts[pts.length - 2], pts[pts.length - 1]);
    ctx.lineJoin = 'miter';
    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    return nearPolyline(point, state.anchors.map((a) => this.anchorToPixel(a, viewport)), tolerance);
  }
}

/** A closed shape through points clicked one by one, filled; a double-click or Enter ends it. */
export class PolylineTool extends DrawingBase {
  descriptor = { type: 'polyline' as const, name: 'Polyline', requiredAnchors: 3, creation: 'path' as const, fill: true };

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    const pts = state.anchors.map((a) => this.anchorToPixel(a, viewport));
    const closed = pts.length >= 3;
    strokePolyline(ctx, pts, closed);
    if (closed) {
      ctx.fillStyle = state.style.fillColor ?? 'rgba(76, 141, 255, 0.1)';
      ctx.fill();
    }
    this.applyLineStyle(ctx, state.style);
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.lineJoin = 'miter';
    this.resetLineStyle(ctx);
    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    const pts = state.anchors.map((a) => this.anchorToPixel(a, viewport));
    return nearPolyline(point, pts, tolerance, true) || (pts.length >= 3 && insidePolygon(point, pts));
  }
}

/** Points along the curve from `s` to `e` that passes through `m` halfway. */
export function curvePoints(s: Point, m: Point, e: Point, steps = CURVE_STEPS): Point[] {
  // The control point that puts the curve's midpoint on `m`.
  const c = { x: 2 * m.x - (s.x + e.x) / 2, y: 2 * m.y - (s.y + e.y) / 2 };
  const pts: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    pts.push({ x: u * u * s.x + 2 * u * t * c.x + t * t * e.x, y: u * u * s.y + 2 * u * t * c.y + t * t * e.y });
  }
  return pts;
}

/**
 * Points along the circle arc from `s` to `e` through `m`; the straight
 * line when the three are in a row.
 */
export function arcPoints(s: Point, m: Point, e: Point, steps = CURVE_STEPS): Point[] {
  const d = 2 * (s.x * (m.y - e.y) + m.x * (e.y - s.y) + e.x * (s.y - m.y));
  if (Math.abs(d) < 1e-9) return [s, e];
  const s2 = s.x * s.x + s.y * s.y;
  const m2 = m.x * m.x + m.y * m.y;
  const e2 = e.x * e.x + e.y * e.y;
  const cx = (s2 * (m.y - e.y) + m2 * (e.y - s.y) + e2 * (s.y - m.y)) / d;
  const cy = (s2 * (e.x - m.x) + m2 * (s.x - e.x) + e2 * (m.x - s.x)) / d;
  const r = Math.hypot(s.x - cx, s.y - cy);
  const a0 = Math.atan2(s.y - cy, s.x - cx);
  const am = Math.atan2(m.y - cy, m.x - cx);
  const a1 = Math.atan2(e.y - cy, e.x - cx);
  // Go from s to e the way that passes m.
  const ccw = (from: number, to: number) => ((to - from) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  const span = ccw(a0, a1);
  const sweep = ccw(a0, am) <= span ? span : span - 2 * Math.PI;
  const pts: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = a0 + (sweep * i) / steps;
    pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  return pts;
}

/** A line bent through a third point: click the start, the end, then where it passes halfway. */
export class CurveTool extends DrawingBase {
  descriptor: DrawingDescriptor = { type: 'curve', name: 'Curve', requiredAnchors: 3 };

  protected shape(s: Point, m: Point, e: Point): Point[] {
    return curvePoints(s, m, e);
  }

  private points(state: DrawingState, viewport: ViewportState): Point[] {
    const pts = state.anchors.map((a) => this.anchorToPixel(a, viewport));
    return pts.length < 3 ? pts : this.shape(pts[0], pts[2], pts[1]);
  }

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    this.applyLineStyle(ctx, state.style);
    strokePolyline(ctx, this.points(state, viewport));
    ctx.stroke();
    this.resetLineStyle(ctx);
    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    return nearPolyline(point, this.points(state, viewport), tolerance);
  }
}

/** A circle arc: click the start, the end, then a point it passes through. */
export class ArcTool extends CurveTool {
  override descriptor: DrawingDescriptor = { type: 'arc', name: 'Arc', requiredAnchors: 3 };

  protected override shape(s: Point, m: Point, e: Point): Point[] {
    return arcPoints(s, m, e);
  }
}
