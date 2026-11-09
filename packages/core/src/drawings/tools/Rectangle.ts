import type { AnchorPoint, DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';
import { drawBoxText, TextHitCache } from './lineText.js';
import { drawingFill } from '../drawingLook.js';
import { drawAnchorHandles } from '../handles.js';

/** The handles between the corners: the sides' middles, drawn a size smaller. */
const SIDE_HANDLES: ReadonlySet<number> = new Set([4, 5, 6, 7]);

/**
 * A box between two corners (its anchors). Eight handles reshape it: 0 and 1
 * the anchors' corners, 2 and 3 the other two, 4 to 7 the middles of its
 * sides (the first anchor's price, the second's, the first's time, the
 * second's), each moving one side.
 */
export class RectangleTool extends DrawingBase {
  descriptor = { type: 'rectangle' as const, name: 'Rectangle', requiredAnchors: 2, fill: true, text: true };

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    // Words not drawn this time (no text, the line off the plot or its points together) are not there to click.
    this.texts.set(state.id, null);
    if (state.anchors.length < 2) return;
    const p1 = this.anchorToPixel(state.anchors[0], viewport);
    const p2 = this.anchorToPixel(state.anchors[1], viewport);
    const x = Math.min(p1.x, p2.x), y = Math.min(p1.y, p2.y);
    const w = Math.abs(p2.x - p1.x), h = Math.abs(p2.y - p1.y);

    if (state.style.fillColor) {
      ctx.fillStyle = drawingFill(state.style);
      ctx.fillRect(x, y, w, h);
    }
    this.applyLineStyle(ctx, state.style);
    ctx.strokeRect(x, y, w, h);
    this.resetLineStyle(ctx);
    this.texts.set(state.id, drawBoxText(ctx, state.style, { x, y, width: w, height: h }));
    if (selected) this.renderBoxHandles(ctx, state, viewport);
  }

  /** The eight handles on screen, in their order. */
  protected override handlePoints(state: DrawingState, viewport: ViewportState): Point[] {
    const a = this.anchorToPixel(state.anchors[0], viewport);
    const b = this.anchorToPixel(state.anchors[1], viewport);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    return [a, b, { x: a.x, y: b.y }, { x: b.x, y: a.y }, { x: mid.x, y: a.y }, { x: mid.x, y: b.y }, { x: a.x, y: mid.y }, { x: b.x, y: mid.y }];
  }

  private renderBoxHandles(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState): void {
    // The corners, then the sides' middles a size smaller.
    drawAnchorHandles(ctx, state, this.handlePoints(state, viewport), { sides: SIDE_HANDLES });
  }

  hitTestAnchor(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): number {
    if (state.anchors.length < 2) return super.hitTestAnchor(point, state, viewport, tolerance);
    // The nearest in reach: on a small box a side's handle is not hidden behind a corner's.
    let best = -1;
    let bestDistance = tolerance;
    this.handlePoints(state, viewport).forEach((p, i) => {
      const distance = Math.hypot(point.x - p.x, point.y - p.y);
      if (distance < bestDistance || (best < 0 && distance <= tolerance)) {
        best = i;
        bestDistance = distance;
      }
    });
    return best;
  }

  moveHandle(state: DrawingState, index: number, anchor: AnchorPoint): DrawingState {
    const [a, b] = state.anchors;
    const moved: Record<number, [AnchorPoint, AnchorPoint]> = {
      0: [anchor, b],
      1: [a, anchor],
      2: [{ time: anchor.time, price: a.price }, { time: b.time, price: anchor.price }],
      3: [{ time: a.time, price: anchor.price }, { time: anchor.time, price: b.price }],
      4: [{ time: a.time, price: anchor.price }, b],
      5: [a, { time: b.time, price: anchor.price }],
      6: [{ time: anchor.time, price: a.price }, b],
      7: [a, { time: anchor.time, price: b.price }],
    };
    return moved[index] ? { ...state, anchors: moved[index] } : state;
  }

  /** Its text's box as last drawn: a click on the words picks it. */
  private texts = new TextHitCache();

  /** Where its words were drawn: the toolbar over a selection keeps clear of them. */
  textBox(state: DrawingState): { x: number; y: number; width: number; height: number } | null {
    return this.texts.bounds(state.id);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    return this.texts.hit(state.id, point, tolerance) || this.hitShape(point, state, viewport, tolerance);
  }

  private hitShape(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    const p1 = this.anchorToPixel(state.anchors[0], viewport);
    const p2 = this.anchorToPixel(state.anchors[1], viewport);
    const x1 = Math.min(p1.x, p2.x) - tolerance, y1 = Math.min(p1.y, p2.y) - tolerance;
    const x2 = Math.max(p1.x, p2.x) + tolerance, y2 = Math.max(p1.y, p2.y) + tolerance;
    if (point.x < x1 || point.x > x2 || point.y < y1 || point.y > y2) return false;
    // Check if near border
    const ix1 = Math.min(p1.x, p2.x) + tolerance, iy1 = Math.min(p1.y, p2.y) + tolerance;
    const ix2 = Math.max(p1.x, p2.x) - tolerance, iy2 = Math.max(p1.y, p2.y) - tolerance;
    return !(point.x > ix1 && point.x < ix2 && point.y > iy1 && point.y < iy2) || !!state.style.fillColor;
  }
}
