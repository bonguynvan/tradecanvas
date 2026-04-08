import type { DrawingState, Point, ViewportState } from '@chart-lib/commons';
import { DrawingBase } from '../DrawingBase.js';

export class TriangleTool extends DrawingBase {
  descriptor = { type: 'triangle' as const, name: 'Triangle', requiredAnchors: 3 };

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 3) {
      if (state.anchors.length === 2) {
        const a = this.anchorToPixel(state.anchors[0], viewport);
        const b = this.anchorToPixel(state.anchors[1], viewport);
        this.applyLineStyle(ctx, state.style);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        this.resetLineStyle(ctx);
      }
      return;
    }
    const pts = state.anchors.map((a) => this.anchorToPixel(a, viewport));

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(pts[1].x, pts[1].y);
    ctx.lineTo(pts[2].x, pts[2].y);
    ctx.closePath();

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
    if (state.anchors.length < 3) return false;
    const pts = state.anchors.map((a) => this.anchorToPixel(a, viewport));
    // Check if near edges
    for (let i = 0; i < 3; i++) {
      const j = (i + 1) % 3;
      if (this.distanceToLine(point, pts[i], pts[j]) <= tolerance) return true;
    }
    return false;
  }
}
