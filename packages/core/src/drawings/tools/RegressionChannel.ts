import type { DrawingState, Point, ViewportState } from '@chart-lib/commons';
import { DrawingBase } from '../DrawingBase.js';

export class RegressionChannelTool extends DrawingBase {
  descriptor = { type: 'regressionChannel' as const, name: 'Regression Channel', requiredAnchors: 2 };

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    const p1 = this.anchorToPixel(state.anchors[0], viewport);
    const p2 = this.anchorToPixel(state.anchors[1], viewport);

    // Draw center line
    this.applyLineStyle(ctx, state.style);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    // Draw parallel channel lines (fixed offset)
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) { this.resetLineStyle(ctx); return; }
    // Channel width scales with line length (20% of length, min 10px, max 100px)
    const channelOffset = Math.max(10, Math.min(len * 0.2, 100));
    const nx = -dy / len * channelOffset;
    const ny = dx / len * channelOffset;

    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(p1.x + nx, p1.y + ny);
    ctx.lineTo(p2.x + nx, p2.y + ny);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p1.x - nx, p1.y - ny);
    ctx.lineTo(p2.x - nx, p2.y - ny);
    ctx.stroke();

    if (state.style.fillColor) {
      ctx.fillStyle = state.style.fillColor;
      ctx.beginPath();
      ctx.moveTo(p1.x + nx, p1.y + ny);
      ctx.lineTo(p2.x + nx, p2.y + ny);
      ctx.lineTo(p2.x - nx, p2.y - ny);
      ctx.lineTo(p1.x - nx, p1.y - ny);
      ctx.closePath();
      ctx.fill();
    }

    this.resetLineStyle(ctx);
    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    const p1 = this.anchorToPixel(state.anchors[0], viewport);
    const p2 = this.anchorToPixel(state.anchors[1], viewport);
    const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const channelOffset = Math.max(10, Math.min(len * 0.2, 100));
    return this.distanceToLine(point, p1, p2) <= tolerance + channelOffset;
  }
}
