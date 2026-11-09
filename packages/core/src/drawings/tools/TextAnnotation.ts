import type { DrawingDescriptor, DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';
import { BoxCache, PAD_X, PAD_Y, drawTextBox, inRect, strokeSelectionFrame, textLook, type Rect } from './textBox.js';
import { textSize } from '../drawingLook.js';

/** Most lines a text draws: it says what it has to, a note keeps short. */
const MAX_TEXT_LINES = 500;
/**
 * Pull annotation text from `style.text`, then `meta.text`, then a literal default.
 * Pure helper — exported so it can be unit-tested without a canvas.
 */
export function resolveAnnotationText(state: DrawingState, fallback = 'Text'): string {
  if (typeof state.style.text === 'string' && state.style.text.length > 0) {
    return state.style.text;
  }
  const metaText = state.meta?.text;
  if (typeof metaText === 'string' && metaText.length > 0) return metaText;
  return fallback;
}

/**
 * Text on the chart, its first letter on its point: lines of its own, wrapped
 * at `style.textWrap` when set, in bold or italics, lined up left, centre or
 * right, with a box behind it and a border when asked.
 */
export class TextAnnotationTool extends DrawingBase {
  descriptor: DrawingDescriptor = { type: 'text', name: 'Text', requiredAnchors: 1, text: true, fill: true };

  private boxes = new BoxCache();

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 1) return;
    const p = this.anchorToPixel(state.anchors[0], viewport);
    const look = { ...textLook(state.style, { box: false, border: false, width: Infinity }), maxLines: MAX_TEXT_LINES };
    const box = drawTextBox(ctx, resolveAnnotationText(state), p.x - PAD_X, p.y - PAD_Y, look);
    this.boxes.set(state.id, box);

    strokeSelectionFrame(ctx, box, state.style.color, selected);
  }

  /**
   * No handle: its point is inside the box's padding, on the first letter, and
   * a handle dragged sets the point to the pointer, which would make the text
   * jump. A press anywhere on it moves it whole; the frame shows it is picked.
   */
  protected override handlePoints(): Point[] {
    return [];
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 1) return false;
    const p = this.anchorToPixel(state.anchors[0], viewport);
    return inRect(point, this.boxes.get(state.id) ?? estimateBox(state, p), tolerance);
  }

  textBox(state: DrawingState): Rect | null {
    return this.boxes.get(state.id) ?? null;
  }

}

/** Roughly the box a text takes before it is first drawn (a hit test with no canvas). */
function estimateBox(state: DrawingState, p: Point): Rect {
  const size = textSize(state.style);
  const lines = resolveAnnotationText(state).split('\n');
  const longest = Math.max(...lines.map((line) => line.length));
  return { x: p.x - PAD_X, y: p.y - PAD_Y, width: longest * size * 0.6 + PAD_X * 2, height: lines.length * size * 1.3 + PAD_Y * 2 };
}
