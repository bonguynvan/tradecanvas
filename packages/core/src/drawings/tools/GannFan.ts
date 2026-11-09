import { belowKeepOut, fillTextWithHalo } from './labels.js';
import type { DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';
import { readableText, roleFont } from '../drawingLook.js';

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

/** How far in from the plot's edge a ray's label sits, px. */
const LABEL_INSET = 4;

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

    const top = chartRect.y;
    const bottom = chartRect.y + chartRect.height;
    ctx.font = roleFont('mark');
    for (const { label, ratio } of GANN_RATIOS) {
      const slope = unitSlope * ratio;
      const farX = extendX;
      const farY = p1.y + slope * (farX - p1.x);

      // The 1x1 in the drawing's line, the other angles as 1 px guides.
      ctx.globalAlpha = 1;
      if (ratio === 1) this.applyLineStyle(ctx, state.style);
      else this.applyGuideStyle(ctx, state.style.color);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(farX, farY);
      ctx.stroke();

      // The label where the ray leaves the plot: by its side, or by its top or foot.
      const exitY = Math.max(top, Math.min(bottom, farY));
      const exitX = slope === 0 || exitY === farY ? farX : p1.x + (exitY - p1.y) / slope;
      if (exitX < chartRect.x || exitX > chartRect.x + chartRect.width) continue;
      ctx.globalAlpha = 1;
      ctx.fillStyle = readableText(state.style.color);
      const atSide = exitY === farY;
      ctx.textAlign = atSide ? (direction > 0 ? 'right' : 'left') : 'center';
      ctx.textBaseline = exitY <= top + 1 ? 'top' : 'bottom';
      const x = atSide ? exitX - direction * LABEL_INSET : exitX;
      const width = ctx.measureText(label).width;
      const x0 = ctx.textAlign === 'right' ? x - width : ctx.textAlign === 'left' ? x : x - width / 2;
      // By the plot's top it goes under the legend, which would cover it there.
      const y = exitY <= top + 1 ? belowKeepOut(x0, x0 + width, exitY) + LABEL_INSET : exitY - LABEL_INSET;
      fillTextWithHalo(ctx, label, x, y);
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
