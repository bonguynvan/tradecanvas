import type { DrawingState, Point, ViewportState } from '@chart-lib/commons';
import { DrawingBase } from '../DrawingBase.js';

export class ParallelChannelTool extends DrawingBase {
  descriptor = { type: 'parallelChannel' as const, name: 'Parallel Channel', requiredAnchors: 3 };

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    const p1 = this.anchorToPixel(state.anchors[0], viewport);
    const p2 = this.anchorToPixel(state.anchors[1], viewport);

    this.applyLineStyle(ctx, state.style);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    if (state.anchors.length >= 3) {
      const p3 = this.anchorToPixel(state.anchors[2], viewport);
      // Perpendicular offset from baseline (p1→p2)
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const perpDist = (p3.x - p1.x) * nx + (p3.y - p1.y) * ny;
      const p1b = { x: p1.x + nx * perpDist, y: p1.y + ny * perpDist };
      const p2b = { x: p2.x + nx * perpDist, y: p2.y + ny * perpDist };

      ctx.beginPath();
      ctx.moveTo(p1b.x, p1b.y);
      ctx.lineTo(p2b.x, p2b.y);
      ctx.stroke();

      // Fill between
      if (state.style.fillColor) {
        ctx.fillStyle = state.style.fillColor;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p2b.x, p2b.y);
        ctx.lineTo(p1b.x, p1b.y);
        ctx.closePath();
        ctx.fill();
      }
    }
    this.resetLineStyle(ctx);
    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    const p1 = this.anchorToPixel(state.anchors[0], viewport);
    const p2 = this.anchorToPixel(state.anchors[1], viewport);
    if (this.distanceToLine(point, p1, p2) <= tolerance) return true;
    if (state.anchors.length >= 3) {
      const p3 = this.anchorToPixel(state.anchors[2], viewport);
      // Perpendicular offset from baseline (p1→p2)
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const perpDist = (p3.x - p1.x) * nx + (p3.y - p1.y) * ny;
      const p1b = { x: p1.x + nx * perpDist, y: p1.y + ny * perpDist };
      const p2b = { x: p2.x + nx * perpDist, y: p2.y + ny * perpDist };
      if (this.distanceToLine(point, p1b, p2b) <= tolerance) return true;
    }
    return false;
  }
}
