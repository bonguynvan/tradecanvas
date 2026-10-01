import type { DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';

const ARC_RADIUS = 28;
const REFERENCE_LENGTH = 48;

/** On-screen angle of A→B in degrees, counter-clockwise from horizontal (up = positive). */
export function screenAngleDeg(a: Point, b: Point): number {
  return (Math.atan2(a.y - b.y, b.x - a.x) * 180) / Math.PI;
}

/**
 * Trend line that shows its on-screen angle: a horizontal reference at the
 * start point, an arc sweeping to the line, and the angle in degrees.
 */
export class TrendAngleTool extends DrawingBase {
  descriptor = { type: 'trendAngle' as const, name: 'Trend Angle', requiredAnchors: 2 };

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    const a = this.anchorToPixel(state.anchors[0], viewport);
    const b = this.anchorToPixel(state.anchors[1], viewport);
    const angle = screenAngleDeg(a, b);
    const dir = b.x >= a.x ? 1 : -1;

    this.applyLineStyle(ctx, state.style);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    this.resetLineStyle(ctx);

    // Dashed horizontal reference + arc between it and the line.
    ctx.strokeStyle = state.style.color;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(a.x + dir * REFERENCE_LENGTH, a.y);
    ctx.stroke();
    ctx.setLineDash([]);

    let lineRad = Math.atan2(b.y - a.y, b.x - a.x);
    const refRad = dir > 0 ? 0 : Math.PI;
    // Up-and-left lands in (-π, -π/2); lift it next to π so the arc takes
    // the short way round instead of sweeping the whole circle.
    if (dir < 0 && lineRad < 0) lineRad += 2 * Math.PI;
    ctx.beginPath();
    ctx.arc(a.x, a.y, ARC_RADIUS, Math.min(refRad, lineRad), Math.max(refRad, lineRad));
    ctx.stroke();

    ctx.font = '11px sans-serif';
    ctx.fillStyle = state.style.color;
    ctx.textAlign = dir > 0 ? 'left' : 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${angle.toFixed(1)}°`, a.x + dir * (ARC_RADIUS + 6), a.y + (angle >= 0 ? -8 : 8));

    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    const a = this.anchorToPixel(state.anchors[0], viewport);
    const b = this.anchorToPixel(state.anchors[1], viewport);
    return this.distanceToLine(point, a, b) <= tolerance;
  }
}
