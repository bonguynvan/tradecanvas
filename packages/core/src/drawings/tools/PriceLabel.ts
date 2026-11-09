import type { DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';
import { formatDrawingPrice } from './labels.js';
import { BoxCache, boxFont } from './textBox.js';
import { labelInk, textSize } from '../drawingLook.js';

/** How far the label's box sits right of and above its point, px. */
const OFFSET_X = 14;
const OFFSET_Y = 18;
/** Room round the words in the box, px: as the other annotation boxes give theirs. */
const PAD_X = 8;
const PAD_Y = 5;
/** A line's height, as a share of the type size. */
const LINE_RATIO = 1.35;
/** The box's corners, px. */
const RADIUS = 3;
/** The dot on the point, px. */
const DOT_RADIUS = 3;

/** The box's height for type `fontSize` px tall. */
function boxHeight(fontSize: number): number {
  return Math.round(fontSize * LINE_RATIO) + PAD_Y * 2;
}

/** Price Label: a callout pinned to a point showing its price (or custom text). */
export class PriceLabelTool extends DrawingBase {
  /** Each label's box as last drawn, measured: a hit test has no canvas to measure with. */
  private drawn = new BoxCache();

  descriptor = { type: 'priceLabel' as const, name: 'Price Label', requiredAnchors: 1, text: true };

  private text(state: DrawingState, viewport: ViewportState): string {
    return state.style.text || formatDrawingPrice(state.anchors[0].price, state.anchors[0].price, viewport);
  }

  private box(ctx: CanvasRenderingContext2D | null, state: DrawingState, p: Point, viewport: ViewportState): { x: number; y: number; w: number; h: number } {
    const fontSize = textSize(state.style, 'label');
    const text = this.text(state, viewport);
    // Without a context (hit-testing) estimate the width from the font size.
    const textW = ctx ? ctx.measureText(text).width : text.length * fontSize * 0.6;
    const h = boxHeight(fontSize);
    return { x: p.x + OFFSET_X, y: p.y - OFFSET_Y - h / 2, w: Math.ceil(textW) + PAD_X * 2, h };
  }

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 1) return;
    const p = this.anchorToPixel(state.anchors[0], viewport);
    // Words people write, in the prose face; a price reads as well in it as in the figures face.
    ctx.font = boxFont(textSize(state.style, 'label'), state.style.bold, state.style.italic);
    const b = this.box(ctx, state, p, viewport);
    this.drawn.set(state.id, { x: b.x, y: b.y, width: b.w, height: b.h });

    // Leader from the point to the callout.
    ctx.strokeStyle = state.style.color;
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(b.x, b.y + b.h);
    ctx.stroke();

    this.fillBox(ctx, b, state.style.color);
    // Black or white, whichever reads on its colour, in either theme.
    ctx.fillStyle = state.style.textColor ?? labelInk(state.style.color);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.text(state, viewport), b.x + PAD_X, b.y + b.h / 2);

    ctx.beginPath();
    ctx.arc(p.x, p.y, DOT_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = state.style.color;
    ctx.fill();

    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  /** The box, rounded and on whole pixels, filled with `color`. */
  private fillBox(ctx: CanvasRenderingContext2D, b: { x: number; y: number; w: number; h: number }, color: string): void {
    const x = Math.round(b.x);
    const y = Math.round(b.y);
    ctx.fillStyle = color;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, Math.round(b.w), Math.round(b.h), RADIUS);
    else ctx.rect(x, y, Math.round(b.w), Math.round(b.h));
    ctx.fill();
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 1) return false;
    const p = this.anchorToPixel(state.anchors[0], viewport);
    if (Math.hypot(point.x - p.x, point.y - p.y) <= tolerance) return true;
    const drawn = this.drawn.get(state.id);
    // Where it was drawn, moved with its point since (a pan between frames).
    const b = drawn ? { ...this.box(null, state, p, viewport), w: drawn.width } : this.box(null, state, p, viewport);
    return point.x >= b.x - tolerance && point.x <= b.x + b.w + tolerance
      && point.y >= b.y - tolerance && point.y <= b.y + b.h + tolerance;
  }
}
