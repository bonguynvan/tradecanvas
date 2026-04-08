import type { DrawingState, Point, ViewportState } from '@chart-lib/commons';
import { DrawingBase } from '../DrawingBase.js';

/**
 * Gann Box drawing tool.
 * Two anchors define a rectangular region. The box is subdivided by
 * Gann angles (diagonal lines) and horizontal/vertical price/time divisions.
 */

const DIVISIONS = [0, 0.25, 0.333, 0.5, 0.667, 0.75, 1];

export class GannBoxTool extends DrawingBase {
  descriptor = { type: 'gannBox' as const, name: 'Gann Box', requiredAnchors: 2 };

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;

    const p1 = this.anchorToPixel(state.anchors[0], viewport);
    const p2 = this.anchorToPixel(state.anchors[1], viewport);

    const left = Math.min(p1.x, p2.x);
    const right = Math.max(p1.x, p2.x);
    const top = Math.min(p1.y, p2.y);
    const bottom = Math.max(p1.y, p2.y);
    const w = right - left;
    const h = bottom - top;

    if (w < 2 || h < 2) return;

    this.applyLineStyle(ctx, state.style);

    // Outer rectangle
    ctx.strokeRect(left, top, w, h);

    // Horizontal divisions
    ctx.save();
    ctx.globalAlpha = 0.35;
    for (const d of DIVISIONS) {
      if (d === 0 || d === 1) continue;
      const y = top + h * d;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
    }

    // Vertical divisions
    for (const d of DIVISIONS) {
      if (d === 0 || d === 1) continue;
      const x = left + w * d;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
    }

    // Diagonal lines (Gann angles)
    ctx.globalAlpha = 0.5;
    ctx.setLineDash([4, 3]);

    // Main diagonal
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(right, bottom);
    ctx.stroke();

    // Anti-diagonal
    ctx.beginPath();
    ctx.moveTo(right, top);
    ctx.lineTo(left, bottom);
    ctx.stroke();

    ctx.restore();
    this.resetLineStyle(ctx);

    // Labels for divisions
    ctx.fillStyle = state.style.color;
    ctx.font = '8px sans-serif';
    ctx.globalAlpha = 0.6;
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'right';
    for (const d of DIVISIONS) {
      if (d === 0 || d === 1) continue;
      const y = top + h * d;
      ctx.fillText(`${(d * 100).toFixed(0)}%`, left - 3, y);
    }
    ctx.globalAlpha = 1;

    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;

    const p1 = this.anchorToPixel(state.anchors[0], viewport);
    const p2 = this.anchorToPixel(state.anchors[1], viewport);

    const left = Math.min(p1.x, p2.x);
    const right = Math.max(p1.x, p2.x);
    const top = Math.min(p1.y, p2.y);
    const bottom = Math.max(p1.y, p2.y);

    // Check outer edges
    if (Math.abs(point.x - left) <= tolerance && point.y >= top - tolerance && point.y <= bottom + tolerance) return true;
    if (Math.abs(point.x - right) <= tolerance && point.y >= top - tolerance && point.y <= bottom + tolerance) return true;
    if (Math.abs(point.y - top) <= tolerance && point.x >= left - tolerance && point.x <= right + tolerance) return true;
    if (Math.abs(point.y - bottom) <= tolerance && point.x >= left - tolerance && point.x <= right + tolerance) return true;

    // Check diagonals
    const dist1 = this.distanceToLine(point, { x: left, y: top }, { x: right, y: bottom });
    if (dist1 <= tolerance) return true;
    const dist2 = this.distanceToLine(point, { x: right, y: top }, { x: left, y: bottom });
    if (dist2 <= tolerance) return true;

    return false;
  }
}
