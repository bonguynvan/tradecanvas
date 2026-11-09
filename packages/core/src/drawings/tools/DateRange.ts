import type { DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';
import { resolveBarIndex } from '../../viewport/ScaleMapping.js';
import { roleFont } from '../drawingLook.js';
import { drawingFill } from '../drawingLook.js';

/** How strongly the range is tinted: lighter than a box, as it runs the plot's height. */
const RANGE_FILL_ALPHA = 0.08;

export class DateRangeTool extends DrawingBase {
  descriptor = { type: 'dateRange' as const, name: 'Date Range', requiredAnchors: 2 };

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    const p1 = this.anchorToPixel(state.anchors[0], viewport);
    const p2 = this.anchorToPixel(state.anchors[1], viewport);
    const { chartRect } = viewport;
    const x1 = Math.min(p1.x, p2.x), x2 = Math.max(p1.x, p2.x);

    // The range in the line's colour, lightly: it spans the whole plot.
    ctx.fillStyle = drawingFill(state.style, RANGE_FILL_ALPHA);
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

    // Bars count — compute via resolved bar indices so the label reflects the
    // actual span on the current timeframe (anchor.time may be a timestamp).
    const idx0 = resolveBarIndex(state.anchors[0].time, viewport);
    const idx1 = resolveBarIndex(state.anchors[1].time, viewport);
    const bars = Math.max(0, Math.round(Math.abs(idx1 - idx0)));
    ctx.font = roleFont('label');
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
