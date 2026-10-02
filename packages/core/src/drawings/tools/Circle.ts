import type { DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';

/** Circle from a center point and a point on its edge. */
export class CircleTool extends DrawingBase {
  descriptor = { type: 'circle' as const, name: 'Circle', requiredAnchors: 2, fill: true };

  private geometry(state: DrawingState, viewport: ViewportState): { c: Point; r: number } {
    const c = this.anchorToPixel(state.anchors[0], viewport);
    const e = this.anchorToPixel(state.anchors[1], viewport);
    return { c, r: Math.hypot(e.x - c.x, e.y - c.y) };
  }

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    const { c, r } = this.geometry(state, viewport);

    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
    if (state.style.fillColor) {
      ctx.fillStyle = state.style.fillColor;
      ctx.fill();
    }
    this.applyLineStyle(ctx, state.style);
    ctx.stroke();
    this.resetLineStyle(ctx);

    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    const { c, r } = this.geometry(state, viewport);
    const d = Math.hypot(point.x - c.x, point.y - c.y);
    // Filled circles are grabbable anywhere inside; outlines only on the edge.
    return state.style.fillColor ? d <= r + tolerance : Math.abs(d - r) <= tolerance;
  }
}
