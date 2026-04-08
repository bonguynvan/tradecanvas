import type { DrawingState, Point, ViewportState } from '@chart-lib/commons';
import { DrawingBase } from '../DrawingBase.js';

export class DateRangeTool extends DrawingBase {
  descriptor = { type: 'dateRange' as const, name: 'Date Range', requiredAnchors: 2 };

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    const p1 = this.anchorToPixel(state.anchors[0], viewport);
    const p2 = this.anchorToPixel(state.anchors[1], viewport);
    const { chartRect } = viewport;
    const x1 = Math.min(p1.x, p2.x), x2 = Math.max(p1.x, p2.x);

    ctx.fillStyle = 'rgba(33, 150, 243, 0.08)';
    ctx.fillRect(x1, chartRect.y, x2 - x1, chartRect.height);

    this.applyLineStyle(ctx, state.style);
    ctx.beginPath();
    ctx.moveTo(x1, chartRect.y);
    ctx.lineTo(x1, chartRect.y + chartRect.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, chartRect.y);
    ctx.lineTo(x2, chartRect.y + chartRect.height);
    ctx.stroke();
    this.resetLineStyle(ctx);

    // Bars count
    const bars = Math.abs(state.anchors[1].time - state.anchors[0].time);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = state.style.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`${bars} bars`, (x1 + x2) / 2, chartRect.y + 4);

    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    const p1 = this.anchorToPixel(state.anchors[0], viewport);
    const p2 = this.anchorToPixel(state.anchors[1], viewport);
    const { chartRect } = viewport;
    const x1 = Math.min(p1.x, p2.x), x2 = Math.max(p1.x, p2.x);
    return point.x >= x1 - tolerance && point.x <= x2 + tolerance &&
      point.y >= chartRect.y && point.y <= chartRect.y + chartRect.height;
  }
}
