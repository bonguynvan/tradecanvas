import type { DrawingState, Point, ViewportState } from '@chart-lib/commons';
import { DrawingBase } from '../DrawingBase.js';

export class VerticalLineTool extends DrawingBase {
  descriptor = { type: 'verticalLine' as const, name: 'Vertical Line', requiredAnchors: 1 };

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 1) return;
    const p = this.anchorToPixel(state.anchors[0], viewport);
    const { chartRect } = viewport;
    this.applyLineStyle(ctx, state.style);
    ctx.beginPath();
    ctx.moveTo(p.x, chartRect.y);
    ctx.lineTo(p.x, chartRect.y + chartRect.height);
    ctx.stroke();
    this.resetLineStyle(ctx);
    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 1) return false;
    const p = this.anchorToPixel(state.anchors[0], viewport);
    const { chartRect } = viewport;
    return Math.abs(point.x - p.x) <= tolerance &&
      point.y >= chartRect.y && point.y <= chartRect.y + chartRect.height;
  }
}
