import type { DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';

/** A horizontal and a vertical line crossing at one point — marks a price and a time at once. */
export class CrossLineTool extends DrawingBase {
  descriptor = { type: 'crossLine' as const, name: 'Cross Line', requiredAnchors: 1 };

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 1) return;
    const p = this.anchorToPixel(state.anchors[0], viewport);
    const { chartRect } = viewport;

    this.applyLineStyle(ctx, state.style);
    const width = ctx.lineWidth;
    this.strokeHorizontal(ctx, chartRect.x, chartRect.x + chartRect.width, p.y);
    ctx.lineWidth = width;
    this.strokeVertical(ctx, p.x, chartRect.y, chartRect.y + chartRect.height);
    this.resetLineStyle(ctx);

    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 1) return false;
    const p = this.anchorToPixel(state.anchors[0], viewport);
    return Math.abs(point.y - p.y) <= tolerance || Math.abs(point.x - p.x) <= tolerance;
  }
}
