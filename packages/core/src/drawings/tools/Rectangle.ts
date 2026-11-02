import type { AnchorPoint, DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';
import { drawingHandleFill } from './labels.js';
import { drawBoxText } from './lineText.js';

/** Half a handle's side (px), as the other tools draw theirs. */
const HANDLE_HALF = 4;

/**
 * A box between two corners (its anchors). Eight handles reshape it: 0 and 1
 * the anchors' corners, 2 and 3 the other two, 4 to 7 the middles of its
 * sides (the first anchor's price, the second's, the first's time, the
 * second's), each moving one side.
 */
export class RectangleTool extends DrawingBase {
  descriptor = { type: 'rectangle' as const, name: 'Rectangle', requiredAnchors: 2, fill: true, text: true };

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    const p1 = this.anchorToPixel(state.anchors[0], viewport);
    const p2 = this.anchorToPixel(state.anchors[1], viewport);
    const x = Math.min(p1.x, p2.x), y = Math.min(p1.y, p2.y);
    const w = Math.abs(p2.x - p1.x), h = Math.abs(p2.y - p1.y);

    if (state.style.fillColor) {
      ctx.fillStyle = state.style.fillColor;
      ctx.fillRect(x, y, w, h);
    }
    this.applyLineStyle(ctx, state.style);
    ctx.strokeRect(x, y, w, h);
    this.resetLineStyle(ctx);
    drawBoxText(ctx, state.style, { x, y, width: w, height: h });
    if (selected) this.renderBoxHandles(ctx, state, viewport);
  }

  /** The eight handles on screen, in their order. */
  private handlePoints(state: DrawingState, viewport: ViewportState): Point[] {
    const a = this.anchorToPixel(state.anchors[0], viewport);
    const b = this.anchorToPixel(state.anchors[1], viewport);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    return [a, b, { x: a.x, y: b.y }, { x: b.x, y: a.y }, { x: mid.x, y: a.y }, { x: mid.x, y: b.y }, { x: a.x, y: mid.y }, { x: b.x, y: mid.y }];
  }

  private renderBoxHandles(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState): void {
    ctx.fillStyle = drawingHandleFill();
    ctx.strokeStyle = state.style.color;
    ctx.lineWidth = 1;
    for (const p of this.handlePoints(state, viewport)) {
      ctx.fillRect(p.x - HANDLE_HALF, p.y - HANDLE_HALF, HANDLE_HALF * 2, HANDLE_HALF * 2);
      ctx.strokeRect(p.x - HANDLE_HALF, p.y - HANDLE_HALF, HANDLE_HALF * 2, HANDLE_HALF * 2);
    }
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

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
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
