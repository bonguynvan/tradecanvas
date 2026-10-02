import type { DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';
import { formatDrawingPrice } from './labels.js';

const OFFSET_X = 14;
const OFFSET_Y = 18;
const PAD_X = 6;
const HEIGHT = 20;

/** Price Label: a callout pinned to a point showing its price (or custom text). */
export class PriceLabelTool extends DrawingBase {
  descriptor = { type: 'priceLabel' as const, name: 'Price Label', requiredAnchors: 1, text: true };

  private text(state: DrawingState): string {
    return state.style.text || formatDrawingPrice(state.anchors[0].price);
  }

  private box(ctx: CanvasRenderingContext2D | null, state: DrawingState, p: Point): { x: number; y: number; w: number; h: number } {
    const fontSize = state.style.fontSize ?? 12;
    // Without a context (hit-testing) estimate the width from the font size.
    const textW = ctx ? ctx.measureText(this.text(state)).width : this.text(state).length * fontSize * 0.6;
    return { x: p.x + OFFSET_X, y: p.y - OFFSET_Y - HEIGHT / 2, w: textW + PAD_X * 2, h: HEIGHT };
  }

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 1) return;
    const p = this.anchorToPixel(state.anchors[0], viewport);
    ctx.font = `${state.style.fontSize ?? 12}px sans-serif`;
    const b = this.box(ctx, state, p);

    // Leader from the point to the callout.
    ctx.strokeStyle = state.style.color;
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(b.x, b.y + b.h);
    ctx.stroke();

    ctx.fillStyle = state.style.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.text(state), b.x + PAD_X, b.y + b.h / 2);

    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = state.style.color;
    ctx.fill();

    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 1) return false;
    const p = this.anchorToPixel(state.anchors[0], viewport);
    if (Math.hypot(point.x - p.x, point.y - p.y) <= tolerance) return true;
    const b = this.box(null, state, p);
    return point.x >= b.x - tolerance && point.x <= b.x + b.w + tolerance
      && point.y >= b.y - tolerance && point.y <= b.y + b.h + tolerance;
  }
}
