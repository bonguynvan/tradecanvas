import type { DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';

/**
 * A horizontal line that only extends forward in time from its anchor —
 * unlike `horizontalLine`, which spans the full chart width. Useful for
 * marking a level ("support starts here") without implying it held in the
 * past too.
 */
export class HorizontalRayTool extends DrawingBase {
  descriptor = { type: 'horizontalRay' as const, name: 'Horizontal Ray', requiredAnchors: 1 };

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 1) return;
    const anchor = this.anchorToPixel(state.anchors[0], viewport);
    const y = anchor.y;
    const { chartRect } = viewport;
    this.applyLineStyle(ctx, state.style);
    ctx.beginPath();
    ctx.moveTo(anchor.x, y);
    ctx.lineTo(chartRect.x + chartRect.width, y);
    ctx.stroke();
    this.resetLineStyle(ctx);

    ctx.fillStyle = state.style.color;
    ctx.font = '11px sans-serif';
    ctx.textBaseline = 'bottom';
    ctx.fillText(state.anchors[0].price.toFixed(2), anchor.x + 4, y - 3);

    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 1) return false;
    const anchor = this.anchorToPixel(state.anchors[0], viewport);
    return (
      Math.abs(point.y - anchor.y) <= tolerance &&
      point.x >= anchor.x - tolerance &&
      point.x <= viewport.chartRect.x + viewport.chartRect.width
    );
  }
}
