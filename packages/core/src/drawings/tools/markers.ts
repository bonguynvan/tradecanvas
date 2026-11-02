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
    const size = measureTextBox(ctx, text, look);
    this.applyLineStyle(ctx, { ...state.style, lineStyle: 'solid' });
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x, p.y - POST_HEIGHT);
    ctx.stroke();
    this.resetLineStyle(ctx);
    this.boxes.set(state.id, drawTextBox(ctx, text, p.x - size.width / 2, p.y - POST_HEIGHT - size.height, look));
    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 1) return false;
    const p = this.anchorToPixel(state.anchors[0], viewport);
    if (Math.abs(point.x - p.x) <= tolerance && point.y <= p.y + tolerance && point.y >= p.y - POST_HEIGHT) return true;
    const size = estimateSize(state, resolveAnnotationText(state, 'Signpost'));
    const box: Rect = this.boxes.get(state.id) ?? { x: p.x - size.width / 2, y: p.y - POST_HEIGHT - size.height, ...size };
    return inRect(point, box, tolerance);
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
    const size = measureTextBox(ctx, text, look);
    const bottom = p.y - TAIL_HEIGHT;
    // The tail first: the bubble covers where it joins.
    ctx.beginPath();
    ctx.moveTo(p.x - TAIL_HALF, bottom);
    ctx.lineTo(p.x, p.y);
    ctx.lineTo(p.x + TAIL_HALF, bottom);
    ctx.closePath();
    if (look.fill) {
      ctx.fillStyle = look.fill;
      ctx.fill();
    }
    ctx.strokeStyle = look.stroke ?? state.style.color;
    ctx.lineWidth = 1;
    ctx.stroke();
    this.boxes.set(state.id, drawTextBox(ctx, text, p.x - size.width / 2, bottom - size.height, look));
    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 1) return false;
    const p = this.anchorToPixel(state.anchors[0], viewport);
    if (Math.abs(point.x - p.x) <= TAIL_HALF + tolerance && point.y <= p.y + tolerance && point.y >= p.y - TAIL_HEIGHT) return true;
    const size = estimateSize(state, resolveAnnotationText(state, 'Comment'));
    const box: Rect = this.boxes.get(state.id) ?? { x: p.x - size.width / 2, y: p.y - TAIL_HEIGHT - size.height, ...size };
    return inRect(point, box, tolerance);
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
