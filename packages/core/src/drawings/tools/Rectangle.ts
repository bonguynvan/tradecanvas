import type { DrawingState, Point, ViewportState } from '@chart-lib/commons';
import { DrawingBase } from '../DrawingBase.js';

export class RectangleTool extends DrawingBase {
  descriptor = { type: 'rectangle' as const, name: 'Rectangle', requiredAnchors: 2 };

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    const p1 = this.anchorToPixel(state.anchors[0], viewport);
    const p2 = this.anchorToPixel(state.anchors[1], viewport);
    const x = Math.min(p1.x, p2.x), y = Math.min(p1.y, p2.y);
    const w = Math.abs(p2.x - p1.x), h = Math.abs(p2.y - p1.y);

    if (state.style.fillColor) {
      ctx.fillStyle = state.style.fillColor;
      ctx.fillRect(x, y, w, h);
    }
    this.applyLineStyle(ctx, state.style);
    ctx.strokeRect(x, y, w, h);
    this.resetLineStyle(ctx);
    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    const p1 = this.anchorToPixel(state.anchors[0], viewport);
    const p2 = this.anchorToPixel(state.anchors[1], viewport);
    const x1 = Math.min(p1.x, p2.x) - tolerance, y1 = Math.min(p1.y, p2.y) - tolerance;
    const x2 = Math.max(p1.x, p2.x) + tolerance, y2 = Math.max(p1.y, p2.y) + tolerance;
    if (point.x < x1 || point.x > x2 || point.y < y1 || point.y > y2) return false;
    // Check if near border
    const ix1 = Math.min(p1.x, p2.x) + tolerance, iy1 = Math.min(p1.y, p2.y) + tolerance;
    const ix2 = Math.max(p1.x, p2.x) - tolerance, iy2 = Math.max(p1.y, p2.y) - tolerance;
    return !(point.x > ix1 && point.x < ix2 && point.y > iy1 && point.y < iy2) || !!state.style.fillColor;
  }
}
