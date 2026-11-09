import type { DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';
import { barsBetween, drawPill, pillHeight, pillWidth, spanBetween } from './labels.js';
import { drawingFill, keepOnPlot, roleFont } from '../drawingLook.js';
import { fillMeasureHead } from './lineDecor.js';

/** How strongly the range is tinted: lighter than a box, as it runs the plot's height. */
const RANGE_FILL_ALPHA = 0.08;
/** How far above the arrow its tag sits, px. */
const TAG_GAP = 6;

/**
 * Date Range: the bars between two times, shaded the plot's height between
 * two sharp edges, an arrow across the middle, and how many bars and how long
 * on a tag over it. Its handles sit on its edges halfway up the plot: their
 * prices mean nothing to it.
 */
export class DateRangeTool extends DrawingBase {
  descriptor = { type: 'dateRange' as const, name: 'Date Range', requiredAnchors: 2 };

  protected override handlePoints(state: DrawingState, viewport: ViewportState): Point[] {
    return this.timeHandles(state, viewport);
  }

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    const p1 = this.anchorToPixel(state.anchors[0], viewport);
    const p2 = this.anchorToPixel(state.anchors[1], viewport);
    const { chartRect } = viewport;
    const x1 = Math.min(p1.x, p2.x), x2 = Math.max(p1.x, p2.x);
    const top = chartRect.y, bottom = chartRect.y + chartRect.height;

    ctx.fillStyle = drawingFill(state.style, RANGE_FILL_ALPHA);
    ctx.fillRect(x1, top, x2 - x1, bottom - top);

    // Its edges sharp, in its line.
    this.applyLineStyle(ctx, state.style);
    this.strokeVertical(ctx, x1, top, bottom);
    ctx.lineWidth = state.style.lineWidth;
    this.strokeVertical(ctx, x2, top, bottom);

    // An arrow across the middle, from the first time to the second.
    const midY = top + (bottom - top) / 2;
    ctx.lineWidth = state.style.lineWidth;
    ctx.beginPath();
    ctx.moveTo(p1.x, midY);
    ctx.lineTo(p2.x, midY);
    ctx.stroke();
    this.resetLineStyle(ctx);
    fillMeasureHead(ctx, { x: p1.x, y: midY }, { x: p2.x, y: midY }, state.style.color, state.style.lineWidth);

    // How many bars and how long, on a tag over the arrow.
    const bars = barsBetween(state, 0, 1, viewport);
    const span = spanBetween(state, 0, 1, viewport);
    const text = span ? `${bars} bars · ${span}` : `${bars} bars`;
    ctx.font = roleFont('label');
    const w = pillWidth(ctx, text);
    const h = pillHeight();
    const at = keepOnPlot((x1 + x2) / 2 - w / 2, midY - TAG_GAP - h, w, h);
    drawPill(ctx, text, at.left, at.top + h / 2, state.style.color);

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
