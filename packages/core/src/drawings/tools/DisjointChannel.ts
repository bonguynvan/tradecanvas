import type { DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase, lineSpace } from '../DrawingBase.js';
import { extendOptions } from './options.js';
import { drawingFill } from '../drawingLook.js';

/** A first line narrower than this across, px, is upright: there is no second line to lean the other way. */
const UPRIGHT_PX = 0.5;

/**
 * Two lines over the same bars that lean opposite ways: the first through
 * its two points, the second through the third point's price halfway along
 * and sloped as the first is, mirrored. A wedge that narrows or widens.
 */
export class DisjointChannelTool extends DrawingBase {
  descriptor = {
    type: 'disjointChannel' as const,
    name: 'Disjoint Channel',
    requiredAnchors: 3,
    fill: true,
    options: { ...extendOptions() },
  };

  /** The ends of the two lines on screen; the second null until the third point is placed. */
  private ends(state: DrawingState, viewport: ViewportState): { first: [Point, Point]; second: [Point, Point] | null } {
    const a = this.anchorToPixel(state.anchors[0], viewport);
    const b = this.anchorToPixel(state.anchors[1], viewport);
    if (state.anchors.length < 3 || Math.abs(b.x - a.x) < UPRIGHT_PX) return { first: [a, b], second: null };
    const y = this.anchorToPixel(state.anchors[2], viewport).y;
    // Through the third point's price halfway along, climbing where the first line falls.
    const half = (b.y - a.y) / 2;
    return { first: [a, b], second: [{ x: a.x, y: y + half }, { x: b.x, y: y - half }] };
  }

  private lines(state: DrawingState, viewport: ViewportState): [Point, Point][] {
    const { first, second } = this.ends(state, viewport);
    const left = this.option<boolean>(state, 'extendLeft');
    const right = this.option<boolean>(state, 'extendRight');
    return [first, ...(second ? [second] : [])].map(([p, q]) => this.extendLine(p, q, viewport, left, right));
  }

  /**
   * Its third handle on the second line, halfway along: where its price is
   * read, and clear of the first line's two handles wherever the lines meet.
   */
  protected override handlePoints(state: DrawingState, viewport: ViewportState): Point[] {
    const points = super.handlePoints(state, viewport);
    const { second } = this.ends(state, viewport);
    if (!second || points.length < 3) return points;
    return [points[0], points[1], { x: (second[0].x + second[1].x) / 2, y: (second[0].y + second[1].y) / 2 }];
  }

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    const { first, second } = this.ends(state, viewport);
    // The fill between the two over the bars they span, under the lines.
    if (second && state.style.fillColor) {
      ctx.fillStyle = drawingFill(state.style);
      ctx.beginPath();
      ctx.moveTo(first[0].x, first[0].y);
      for (const p of [first[1], second[1], second[0]]) ctx.lineTo(p.x, p.y);
      ctx.closePath();
      ctx.fill();
    }
    this.applyLineStyle(ctx, state.style);
    for (const [p, q] of this.lines(state, viewport)) {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
      ctx.stroke();
    }
    this.resetLineStyle(ctx);
    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  /** Both lines' prices at a time, the first line's first. */
  priceAt(state: DrawingState, time: number, viewport?: ViewportState): number[] | null {
    if (state.anchors.length < 3) return null;
    const [a, b, c] = state.anchors;
    const space = lineSpace(viewport);
    const first = this.lineValueAt(a, b, time, this.option(state, 'extendLeft'), this.option(state, 'extendRight'), space);
    if (first === null) return null;
    // The second line is the first turned over: as far above the third point's price as the first is under its own middle.
    const turn = (space.value(a.price) + space.value(b.price)) / 2 + space.value(c.price);
    return [first, turn - first].map(space.price);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    return this.lines(state, viewport).some(([p, q]) => this.distanceToLine(point, p, q) <= tolerance);
  }
}
