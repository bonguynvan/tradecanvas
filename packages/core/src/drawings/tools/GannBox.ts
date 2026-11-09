import type { DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';
import { drawingLook, readableText, roleFont } from '../drawingLook.js';
import { fillTextWithHalo } from './labels.js';

/**
 * Gann Box drawing tool.
 * Two anchors define a rectangular region. The box is subdivided by
 * Gann angles (diagonal lines) and horizontal/vertical price/time divisions.
 */

const DIVISIONS = [0, 0.25, 0.333, 0.5, 0.667, 0.75, 1];
/** The divisions inside the box. */
const INNER = DIVISIONS.filter((d) => d > 0 && d < 1);
/** How strongly the grid shows. */
const GRID_ALPHA = 0.3;
/** How far a label sits off the box, px, and the least room between two labels. */
const LABEL_GAP = 4;
const LABEL_ROOM = 2;

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

    // The box on whole pixels, in the drawing's line.
    this.applyLineStyle(ctx, state.style);
    this.strokeCrispRect(ctx, left, top, w, h);

    // Its divisions: a 1 px grid, lighter than the box, each line sharp.
    ctx.save();
    this.applyGuideStyle(ctx, state.style.color);
    ctx.globalAlpha = GRID_ALPHA;
    for (const d of INNER) {
      this.strokeHorizontal(ctx, left, right, top + h * d);
      ctx.lineWidth = 1;
      this.strokeVertical(ctx, left + w * d, top, bottom);
      ctx.lineWidth = 1;
    }
    // The Gann angles corner to corner, dashed.
    this.applyGuideStyle(ctx, state.style.color, true);
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(right, bottom);
    ctx.moveTo(right, top);
    ctx.lineTo(left, bottom);
    ctx.stroke();
    ctx.restore();
    this.resetLineStyle(ctx);

    this.renderLabels(ctx, state, { left, right, top, bottom, w, h });

    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  /**
   * The divisions' shares, in price down the box's left side and in time
   * under it; a label that would cover one already drawn is left out, the
   * half kept first.
   */
  private renderLabels(ctx: CanvasRenderingContext2D, state: DrawingState, box: { left: number; right: number; top: number; bottom: number; w: number; h: number }): void {
    const size = drawingLook().sizes.mark;
    ctx.font = roleFont('mark');
    ctx.fillStyle = readableText(state.style.color);
    const order = [...INNER].sort((a, b) => Math.abs(a - 0.5) - Math.abs(b - 0.5));
    const taken: { x0: number; x1: number; y0: number; y1: number }[] = [];
    const free = (r: { x0: number; x1: number; y0: number; y1: number }) =>
      taken.every((t) => r.x1 + LABEL_ROOM <= t.x0 || t.x1 + LABEL_ROOM <= r.x0 || r.y1 + LABEL_ROOM <= t.y0 || t.y1 + LABEL_ROOM <= r.y0);
    for (const d of order) {
      const text = `${Math.round(d * 100)}%`;
      const width = ctx.measureText(text).width;
      // In price: right-aligned left of the box, centred on its line.
      const y = box.top + box.h * d;
      const price = { x0: box.left - LABEL_GAP - width, x1: box.left - LABEL_GAP, y0: y - size / 2, y1: y + size / 2 };
      if (free(price)) {
        taken.push(price);
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        fillTextWithHalo(ctx, text, price.x1, y);
      }
      // In time: centred under its line.
      const x = box.left + box.w * d;
      const time = { x0: x - width / 2, x1: x + width / 2, y0: box.bottom + LABEL_GAP, y1: box.bottom + LABEL_GAP + size };
      if (free(time)) {
        taken.push(time);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        fillTextWithHalo(ctx, text, x, time.y0);
      }
    }
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
