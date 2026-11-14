import type { DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';
import { drawingFill } from '../drawingLook.js';

/**
 * A rectangle at any angle: one side through its first two points, and as
 * deep as the third point is far from that side. Square on the screen, so
 * its far side follows the chart's scale as it is zoomed.
 */
export class RotatedRectangleTool extends DrawingBase {
  descriptor = { type: 'rotatedRectangle' as const, name: 'Rotated Rectangle', requiredAnchors: 3, fill: true };

  /** Its four corners on screen, the first side's two first; null for a side with no length. */
  private corners(state: DrawingState, viewport: ViewportState): [Point, Point, Point, Point] | null {
    const a = this.anchorToPixel(state.anchors[0], viewport);
    const b = this.anchorToPixel(state.anchors[1], viewport);
    const c = this.anchorToPixel(state.anchors[2], viewport);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy);
    if (length === 0) return null;
    // Square to the side, and how far the third point is that way.
    const normal = { x: -dy / length, y: dx / length };
    const depth = (c.x - a.x) * normal.x + (c.y - a.y) * normal.y;
    const far = (p: Point): Point => ({ x: p.x + normal.x * depth, y: p.y + normal.y * depth });
    return [a, b, far(b), far(a)];
  }

  /** Its third handle in the middle of the far side: it sets the depth, wherever along the side it was clicked. */
  protected override handlePoints(state: DrawingState, viewport: ViewportState): Point[] {
    const points = super.handlePoints(state, viewport);
    const corners = points.length >= 3 ? this.corners(state, viewport) : null;
    if (!corners) return points;
    return [points[0], points[1], { x: (corners[2].x + corners[3].x) / 2, y: (corners[2].y + corners[3].y) / 2 }];
  }

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    if (state.anchors.length < 3) {
      // Its first side, while the depth is still to be set.
      const a = this.anchorToPixel(state.anchors[0], viewport);
      const b = this.anchorToPixel(state.anchors[1], viewport);
      this.applyLineStyle(ctx, state.style);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      this.resetLineStyle(ctx);
      return;
    }
    const corners = this.corners(state, viewport);
    if (!corners) return;
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (const p of corners.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    if (state.style.fillColor) {
      ctx.fillStyle = drawingFill(state.style);
      ctx.fill();
    }
    this.applyLineStyle(ctx, state.style);
    ctx.stroke();
    this.resetLineStyle(ctx);
    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 3) return false;
    const corners = this.corners(state, viewport);
    if (!corners) return false;
    const onEdge = corners.some((p, i) => this.distanceToLine(point, p, corners[(i + 1) % corners.length]) <= tolerance);
    if (onEdge || !state.style.fillColor) return onEdge;
    // Inside a filled one: on the same side of all four edges.
    const sides = corners.map((p, i) => {
      const q = corners[(i + 1) % corners.length];
      return (q.x - p.x) * (point.y - p.y) - (q.y - p.y) * (point.x - p.x);
    });
    return sides.every((s) => s >= 0) || sides.every((s) => s <= 0);
  }
}
