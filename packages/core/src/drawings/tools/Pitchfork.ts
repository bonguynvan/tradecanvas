import type { DrawingDescriptor, DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';
import { drawingFill } from '../drawingLook.js';

type Rect = ViewportState['chartRect'];

/**
 * How far along `dir` (a unit vector) a ray from `from` runs before it leaves `rect`, px;
 * 0 when it never crosses it ahead of `from`. The tines and the median stop there, at the
 * plot's edge, instead of running on past it.
 */
function reachInside(from: Point, dir: Point, rect: Rect): number {
  let reach = Infinity;
  if (dir.x > 0) reach = Math.min(reach, (rect.x + rect.width - from.x) / dir.x);
  if (dir.x < 0) reach = Math.min(reach, (rect.x - from.x) / dir.x);
  if (dir.y > 0) reach = Math.min(reach, (rect.y + rect.height - from.y) / dir.y);
  if (dir.y < 0) reach = Math.min(reach, (rect.y - from.y) / dir.y);
  return Number.isFinite(reach) ? Math.max(0, reach) : 0;
}

/** `p` moved `k` px along `dir`. */
function along(p: Point, dir: Point, k: number): Point {
  return { x: p.x + dir.x * k, y: p.y + dir.y * k };
}

/** The fork on screen: its origin, its reactions B and C, and the direction its lines run. */
interface Fork {
  pivot: Point;
  origin: Point;
  b: Point;
  c: Point;
  dir: Point;
}

/** The lines a fork draws, as it draws them: B–C, then the median and the two tines up to the plot's edge. */
function forkSegments(fork: Fork, rect: Rect): [Point, Point][] {
  const { origin, b, c, dir } = fork;
  const lines = [origin, b, c].map((start): [Point, Point] => [start, along(start, dir, reachInside(start, dir, rect))]);
  return [[b, c], ...lines];
}

export class PitchforkTool extends DrawingBase {
  descriptor: DrawingDescriptor = { type: 'pitchfork', name: "Andrews' Pitchfork", requiredAnchors: 3, fill: true };

  /**
   * Where the median line starts, given pivot A and the first reaction B.
   * Andrews' starts at A; the Schiff variants shift it toward B.
   */
  protected origin(p0: Point, _p1: Point): Point {
    return p0;
  }

  private fork(state: DrawingState, viewport: ViewportState): Fork {
    const pivot = this.anchorToPixel(state.anchors[0], viewport);
    const b = this.anchorToPixel(state.anchors[1], viewport);
    const c = this.anchorToPixel(state.anchors[2], viewport);
    const origin = this.origin(pivot, b);
    const mid = { x: (b.x + c.x) / 2, y: (b.y + c.y) / 2 };
    const dx = mid.x - origin.x;
    const dy = mid.y - origin.y;
    const len = Math.hypot(dx, dy) || 1;
    return { pivot, origin, b, c, dir: { x: dx / len, y: dy / len } };
  }

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 3) {
      if (state.anchors.length === 2) this.renderFirstLeg(ctx, state, viewport);
      return;
    }
    const fork = this.fork(state, viewport);
    const rect = viewport.chartRect;

    // The shade first, so it doesn't dim the lines over it.
    this.fillTines(ctx, state, fork, rect);
    this.renderOriginGuide(ctx, state, fork);

    this.applyLineStyle(ctx, state.style);
    for (const [from, to] of forkSegments(fork, rect)) this.strokeSegment(ctx, from, to);
    this.resetLineStyle(ctx);

    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  /** While C is still being placed: the line from A to B. */
  private renderFirstLeg(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState): void {
    const a = this.anchorToPixel(state.anchors[0], viewport);
    const b = this.anchorToPixel(state.anchors[1], viewport);
    this.applyLineStyle(ctx, state.style);
    this.strokeSegment(ctx, a, b);
    this.resetLineStyle(ctx);
  }

  /**
   * The area between the tines, from the B–C line out to where the tines leave the plot,
   * tinted in the line's colour unless a fill is set by hand. Both tines run as far as the
   * longer one and the shade is clipped to the plot, so its far edge is the plot's edge.
   */
  private fillTines(ctx: CanvasRenderingContext2D, state: DrawingState, fork: Fork, rect: Rect): void {
    const { b, c, dir } = fork;
    const reach = Math.max(reachInside(b, dir, rect), reachInside(c, dir, rect));
    if (reach <= 0) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.width, rect.height);
    ctx.clip();
    ctx.fillStyle = drawingFill(state.style);
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    const cEnd = along(c, dir, reach);
    const bEnd = along(b, dir, reach);
    ctx.lineTo(cEnd.x, cEnd.y);
    ctx.lineTo(bEnd.x, bEnd.y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /** The Schiff variants: a guide from pivot A to the shifted origin, showing how the two relate. */
  private renderOriginGuide(ctx: CanvasRenderingContext2D, state: DrawingState, fork: Fork): void {
    const { pivot, origin } = fork;
    if (pivot.x === origin.x && pivot.y === origin.y) return;
    this.applyGuideStyle(ctx, state.style.color, true);
    this.strokeSegment(ctx, pivot, origin);
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
  }

  private strokeSegment(ctx: CanvasRenderingContext2D, from: Point, to: Point): void {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  /** On a line as drawn: B–C, or the median or a tine up to the plot's edge. */
  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 3) return false;
    return forkSegments(this.fork(state, viewport), viewport.chartRect)
      .some(([from, to]) => this.distanceToLine(point, from, to) <= tolerance);
  }
}

/** Schiff Pitchfork: the median starts halfway in price from A to B, at A's time. */
export class SchiffPitchforkTool extends PitchforkTool {
  override descriptor: DrawingDescriptor = { type: 'schiffPitchfork', name: 'Schiff Pitchfork', requiredAnchors: 3, fill: true };

  protected override origin(p0: Point, p1: Point): Point {
    return { x: p0.x, y: (p0.y + p1.y) / 2 };
  }
}

/** Modified Schiff Pitchfork: the median starts at the midpoint of A and B, in both time and price. */
export class ModifiedSchiffPitchforkTool extends PitchforkTool {
  override descriptor: DrawingDescriptor = { type: 'modifiedSchiffPitchfork', name: 'Modified Schiff Pitchfork', requiredAnchors: 3, fill: true };

  protected override origin(p0: Point, p1: Point): Point {
    return { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
  }
}
