import type { DrawingState, Point, ViewportState } from '@chart-lib/commons';
import { DrawingBase } from '../DrawingBase.js';

export class EllipseTool extends DrawingBase {
  descriptor = { type: 'ellipse' as const, name: 'Ellipse', requiredAnchors: 2 };

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    const p1 = this.anchorToPixel(state.anchors[0], viewport);
    const p2 = this.anchorToPixel(state.anchors[1], viewport);
    const cx = (p1.x + p2.x) / 2, cy = (p1.y + p2.y) / 2;
    const rx = Math.abs(p2.x - p1.x) / 2, ry = Math.abs(p2.y - p1.y) / 2;

    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(rx, 1), Math.max(ry, 1), 0, 0, Math.PI * 2);
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
    const p1 = this.anchorToPixel(state.anchors[0], viewport);
    const p2 = this.anchorToPixel(state.anchors[1], viewport);
    const cx = (p1.x + p2.x) / 2, cy = (p1.y + p2.y) / 2;
    const rx = Math.max(Math.abs(p2.x - p1.x) / 2, 1);
    const ry = Math.max(Math.abs(p2.y - p1.y) / 2, 1);
    const dx = (point.x - cx) / rx, dy = (point.y - cy) / ry;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Normalized tolerance: tolerance pixels mapped to ellipse-normalized space
    const normTol = tolerance / Math.max(Math.min(rx, ry), 4);
    // Hit if within the stroke band around the ellipse edge (dist ≈ 1)
    return state.style.fillColor ? dist <= 1 + normTol : Math.abs(dist - 1) <= normTol;
  }
}
