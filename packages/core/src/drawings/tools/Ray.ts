import type { DrawingState, Point, ViewportState } from '@chart-lib/commons';
import { DrawingBase } from '../DrawingBase.js';

export class RayTool extends DrawingBase {
  descriptor = { type: 'ray' as const, name: 'Ray', requiredAnchors: 2 };

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    const p1 = this.anchorToPixel(state.anchors[0], viewport);
    const p2 = this.anchorToPixel(state.anchors[1], viewport);
    const { chartRect } = viewport;

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) return;

    // Extend to chart edge
    const maxDist = Math.hypot(chartRect.width, chartRect.height) * 2;
    const endX = p1.x + (dx / len) * maxDist;
    const endY = p1.y + (dy / len) * maxDist;

    this.applyLineStyle(ctx, state.style);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    this.resetLineStyle(ctx);
    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    const p1 = this.anchorToPixel(state.anchors[0], viewport);
    const p2 = this.anchorToPixel(state.anchors[1], viewport);
    // Only test in the ray direction (from p1 toward p2)
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const t = ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / (dx * dx + dy * dy);
    if (t < 0) return false;
    return this.distanceToInfiniteLine(point, p1, p2) <= tolerance;
  }
}
