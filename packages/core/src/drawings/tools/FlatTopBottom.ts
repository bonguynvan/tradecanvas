import type { DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase, lineSpace } from '../DrawingBase.js';
import { extendOptions } from './options.js';
import { drawingFill } from '../drawingLook.js';

/**
 * A sloping line through two points and a level one at the third point's
 * price, over the same bars: a flat top over rising lows, or a flat bottom
 * under falling highs.
 */
export class FlatTopBottomTool extends DrawingBase {
  descriptor = {
    type: 'flatTopBottom' as const,
    name: 'Flat Top/Bottom',
    requiredAnchors: 3,
    fill: true,
    options: { ...extendOptions() },
  };

  /** The ends of the sloping line and of the level one on screen; the level null until the third point is placed. */
  private ends(state: DrawingState, viewport: ViewportState): { slope: [Point, Point]; level: [Point, Point] | null } {
    const a = this.anchorToPixel(state.anchors[0], viewport);
    const b = this.anchorToPixel(state.anchors[1], viewport);
    if (state.anchors.length < 3) return { slope: [a, b], level: null };
    const y = this.anchorToPixel(state.anchors[2], viewport).y;
    return { slope: [a, b], level: [{ x: a.x, y }, { x: b.x, y }] };
  }

  private lines(state: DrawingState, viewport: ViewportState): [Point, Point][] {
    const { slope, level } = this.ends(state, viewport);
    const left = this.option<boolean>(state, 'extendLeft');
    const right = this.option<boolean>(state, 'extendRight');
    return [slope, ...(level ? [level] : [])].map(([p, q]) => this.extendLine(p, q, viewport, left, right));
  }

  /** Its third handle on the level, halfway along it: it sets a price, whatever bar it was clicked on. */
  protected override handlePoints(state: DrawingState, viewport: ViewportState): Point[] {
    const points = super.handlePoints(state, viewport);
    const { level } = this.ends(state, viewport);
    return level && points.length >= 3 ? [points[0], points[1], { x: (level[0].x + level[1].x) / 2, y: level[0].y }] : points;
  }

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    const { slope, level } = this.ends(state, viewport);
    if (level && state.style.fillColor) {
      ctx.fillStyle = drawingFill(state.style);
      ctx.beginPath();
      ctx.moveTo(slope[0].x, slope[0].y);
      for (const p of [slope[1], level[1], level[0]]) ctx.lineTo(p.x, p.y);
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

  /** The sloping line's price at a time, then the level's. */
  priceAt(state: DrawingState, time: number, viewport?: ViewportState): number[] | null {
    if (state.anchors.length < 3) return null;
    const [a, b, c] = state.anchors;
    const slope = this.linePriceAt(a, b, time, this.option(state, 'extendLeft'), this.option(state, 'extendRight'), lineSpace(viewport));
    return slope === null ? null : [slope, c.price];
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    return this.lines(state, viewport).some(([p, q]) => this.distanceToLine(point, p, q) <= tolerance);
  }
}
