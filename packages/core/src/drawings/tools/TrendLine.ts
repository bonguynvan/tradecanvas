import type { DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';
import { extendOptions } from './options.js';

export class TrendLineTool extends DrawingBase {
  descriptor = { type: 'trendLine' as const, name: 'Trend Line', requiredAnchors: 2, options: extendOptions() };

  private segment(state: DrawingState, viewport: ViewportState): [Point, Point] {
    const p1 = this.anchorToPixel(state.anchors[0], viewport);
    const p2 = this.anchorToPixel(state.anchors[1], viewport);
    return this.extendLine(p1, p2, viewport, this.option(state, 'extendLeft'), this.option(state, 'extendRight'));
  }

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    const [p1, p2] = this.segment(state, viewport);
    this.applyLineStyle(ctx, state.style);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    this.resetLineStyle(ctx);
    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  priceAt(state: DrawingState, time: number): number[] | null {
    if (state.anchors.length < 2) return null;
    const price = this.linePriceAt(state.anchors[0], state.anchors[1], time, this.option(state, 'extendLeft'), this.option(state, 'extendRight'));
    return price === null ? null : [price];
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    const [p1, p2] = this.segment(state, viewport);
    return this.distanceToLine(point, p1, p2) <= tolerance;
  }
}
