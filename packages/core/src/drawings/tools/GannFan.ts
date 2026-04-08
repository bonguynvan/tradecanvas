import type { DrawingState, Point, ViewportState } from '@chart-lib/commons';
import { DrawingBase } from '../DrawingBase.js';

/**
 * Gann Fan drawing tool.
 * Two anchors define the 1x1 angle (45°). Additional ratio lines fan out
 * from the first anchor: 1x1, 1x2, 2x1, 1x3, 3x1, 1x4, 4x1, 1x8, 8x1.
 */

const GANN_RATIOS = [
  { label: '8x1', ratio: 8 },
  { label: '4x1', ratio: 4 },
  { label: '3x1', ratio: 3 },
  { label: '2x1', ratio: 2 },
  { label: '1x1', ratio: 1 },
  { label: '1x2', ratio: 0.5 },
  { label: '1x3', ratio: 1 / 3 },
  { label: '1x4', ratio: 0.25 },
  { label: '1x8', ratio: 0.125 },
];

export class GannFanTool extends DrawingBase {
  descriptor = { type: 'gannFan' as const, name: 'Gann Fan', requiredAnchors: 2 };

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;

    const p1 = this.anchorToPixel(state.anchors[0], viewport);
    const p2 = this.anchorToPixel(state.anchors[1], viewport);

    // The 1x1 line goes from p1 to p2. We use it to compute the unit scale.
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    if (Math.abs(dx) < 1) return;

    // The unit price-per-bar in pixel space is defined by the 1x1 angle
    const unitSlope = dy / dx;
    const direction = dx > 0 ? 1 : -1;
    const { chartRect } = viewport;
    const extendX = direction > 0
      ? chartRect.x + chartRect.width
      : chartRect.x;

    this.applyLineStyle(ctx, state.style);

    for (const { label, ratio } of GANN_RATIOS) {
      const slope = unitSlope * ratio;
      const farX = extendX;
      const farY = p1.y + slope * (farX - p1.x);

      ctx.globalAlpha = ratio === 1 ? 1 : 0.5;
      ctx.lineWidth = ratio === 1 ? state.style.lineWidth : Math.max(0.5, state.style.lineWidth * 0.7);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(farX, farY);
      ctx.stroke();

      // Label at the end
      const labelX = farX - direction * 4;
      const labelY = farY;
      if (labelY > chartRect.y && labelY < chartRect.y + chartRect.height) {
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = state.style.color;
        ctx.font = '9px sans-serif';
        ctx.textAlign = direction > 0 ? 'right' : 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(label, labelX, labelY - 2);
      }
    }

    ctx.globalAlpha = 1;
    this.resetLineStyle(ctx);
    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;

    const p1 = this.anchorToPixel(state.anchors[0], viewport);
    const p2 = this.anchorToPixel(state.anchors[1], viewport);
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    if (Math.abs(dx) < 1) return false;

    const unitSlope = dy / dx;
    const direction = dx > 0 ? 1 : -1;
    const { chartRect } = viewport;
    const extendX = direction > 0
      ? chartRect.x + chartRect.width
      : chartRect.x;

    for (const { ratio } of GANN_RATIOS) {
      const slope = unitSlope * ratio;
      const farX = extendX;
      const farY = p1.y + slope * (farX - p1.x);
      const dist = this.distanceToLine(point, p1, { x: farX, y: farY });
      if (dist <= tolerance) return true;
    }
    return false;
  }
}
