import type { DrawingDescriptor, DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';
import { resolveAnnotationText, TextAnnotationTool } from './TextAnnotation.js';
import { NoteTool } from './annotations.js';
import { BoxCache, drawTextBox, inRect, measureTextBox, textLook, type Rect, type TextBoxLook } from './textBox.js';

/** Widest a signpost's or a balloon's text runs before it wraps (px). */
const MARKER_WIDTH = 200;
const DEFAULT_FONT_SIZE = 13;
/** A signpost's post: from its bar's point up to its board (px). */
const POST_HEIGHT = 36;
/** A balloon's tail: from its bubble down to its bar's point (px), and half its width where it leaves the bubble. */
const TAIL_HEIGHT = 12;
const TAIL_HALF = 6;

function markerLook(state: DrawingState): TextBoxLook {
  return textLook(state.style, { fontSize: DEFAULT_FONT_SIZE, box: true, border: true, width: MARKER_WIDTH, fill: 'rgba(76, 141, 255, 0.1)' });
}

/**
 * Where a marker's box goes for its point `p`: centred over it, `gap` px
 * above, or under it when that would leave the plot's top; and slid along,
 * still over its point, so it stays on the plot sideways. `below` says which way it went.
 */
function markerBox(p: Point, size: { width: number; height: number }, gap: number, viewport: ViewportState): Rect & { below: boolean } {
  const plot = viewport.chartRect;
  const below = p.y - gap - size.height < plot.y;
  // It slides only as far as still stands over its point: scrolled off, it goes with its bar.
  const lo = Math.max(plot.x, p.x - size.width);
  const hi = Math.min(plot.x + plot.width - size.width, p.x);
  const centred = p.x - size.width / 2;
  const left = lo <= hi ? Math.max(lo, Math.min(centred, hi)) : centred;
  return { x: left, y: below ? p.y + gap : p.y - gap - size.height, ...size, below };
}

/** A box `text` would roughly take before it is drawn (for a hit test). */
function estimateSize(state: DrawingState, text: string): { width: number; height: number } {
  const size = state.style.fontSize || DEFAULT_FONT_SIZE;
  const lines = text.split('\n');
  const longest = Math.max(...lines.map((line) => line.length));
  return { width: Math.min(MARKER_WIDTH, longest * size * 0.6) + 16, height: lines.length * size * 1.3 + 12 };
}

/** A signpost on a bar: its text on a board at the top of a post that stands on the bar's point. */
export class SignpostTool extends DrawingBase {
  descriptor: DrawingDescriptor = { type: 'signpost', name: 'Signpost', requiredAnchors: 1, text: true, fill: true };

  private boxes = new BoxCache();

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 1) return;
    const p = this.anchorToPixel(state.anchors[0], viewport);
    const text = resolveAnnotationText(state, 'Signpost');
    const look = markerLook(state);
    const box = markerBox(p, measureTextBox(ctx, text, look), POST_HEIGHT, viewport);
    // Near the plot's top the post hangs down and the board under it.
    this.applyLineStyle(ctx, { ...state.style, lineStyle: 'solid' });
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x, box.below ? p.y + POST_HEIGHT : p.y - POST_HEIGHT);
    ctx.stroke();
    this.resetLineStyle(ctx);
    this.boxes.set(state.id, drawTextBox(ctx, text, box.x, box.y, look));
    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 1) return false;
    const p = this.anchorToPixel(state.anchors[0], viewport);
    const box: Rect = this.boxes.get(state.id) ?? markerBox(p, estimateSize(state, resolveAnnotationText(state, 'Signpost')), POST_HEIGHT, viewport);
    const [postTop, postBottom] = box.y > p.y ? [p.y, p.y + POST_HEIGHT] : [p.y - POST_HEIGHT, p.y];
    if (Math.abs(point.x - p.x) <= tolerance && point.y >= postTop - tolerance && point.y <= postBottom + tolerance) return true;
    return inRect(point, box, tolerance);
  }

  textBox(state: DrawingState): Rect | null {
    return this.boxes.get(state.id) ?? null;
  }
}

/** A comment balloon on a bar: its text in a bubble above, with a tail pointing down at the bar's point. */
export class BalloonTool extends DrawingBase {
  descriptor: DrawingDescriptor = { type: 'balloon', name: 'Balloon', requiredAnchors: 1, text: true, fill: true };

  private boxes = new BoxCache();

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 1) return;
    const p = this.anchorToPixel(state.anchors[0], viewport);
    const text = resolveAnnotationText(state, 'Comment');
    const look = markerLook(state);
    const box = markerBox(p, measureTextBox(ctx, text, look), TAIL_HEIGHT, viewport);
    // The tail first, from the bubble's edge nearest the point (its foot, or its top when it hangs under).
    const base = box.below ? p.y + TAIL_HEIGHT : p.y - TAIL_HEIGHT;
    ctx.beginPath();
    ctx.moveTo(p.x - TAIL_HALF, base);
    ctx.lineTo(p.x, p.y);
    ctx.lineTo(p.x + TAIL_HALF, base);
    if (look.fill) {
      ctx.fillStyle = look.fill;
      ctx.fill();
    }
    // Its two sides only, and only with the bubble's border: the bubble's own edge closes it.
    if (look.stroke) {
      ctx.strokeStyle = look.stroke;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    this.boxes.set(state.id, drawTextBox(ctx, text, box.x, box.y, look));
    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 1) return false;
    const p = this.anchorToPixel(state.anchors[0], viewport);
    const box: Rect = this.boxes.get(state.id) ?? markerBox(p, estimateSize(state, resolveAnnotationText(state, 'Comment')), TAIL_HEIGHT, viewport);
    const [tailTop, tailBottom] = box.y > p.y ? [p.y, p.y + TAIL_HEIGHT] : [p.y - TAIL_HEIGHT, p.y];
    if (Math.abs(point.x - p.x) <= TAIL_HALF + tolerance && point.y >= tailTop - tolerance && point.y <= tailBottom + tolerance) return true;
    return inRect(point, box, tolerance);
  }

  textBox(state: DrawingState): Rect | null {
    return this.boxes.get(state.id) ?? null;
  }
}

/** A text kept to a place on the screen: it stays there as the chart scrolls, zooms or changes symbol. */
export class AnchoredTextTool extends TextAnnotationTool {
  descriptor: DrawingDescriptor = { type: 'anchoredText', name: 'Anchored Text', requiredAnchors: 1, text: true, fill: true, anchoring: 'screen' };
}

/** A note kept to a place on the screen, its pin and box staying there as the chart moves. */
export class AnchoredNoteTool extends NoteTool {
  descriptor: DrawingDescriptor = {
    type: 'anchoredNote',
    name: 'Anchored Note',
    requiredAnchors: 1,
    text: true,
    fill: true,
    anchoring: 'screen',
    options: { showText: { kind: 'boolean', label: 'Show text', default: true } },
  };
}
