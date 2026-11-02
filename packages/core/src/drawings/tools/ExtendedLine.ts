import type { DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase, lineSpace } from '../DrawingBase.js';
import { LINE_STATS_OPTIONS, drawLineStats } from './lineDecor.js';
import { drawLineText, TextHitCache } from './lineText.js';

export class ExtendedLineTool extends DrawingBase {
  descriptor = { type: 'extendedLine' as const, name: 'Extended Line', requiredAnchors: 2, text: true, options: LINE_STATS_OPTIONS };

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    const p1 = this.anchorToPixel(state.anchors[0], viewport);
    const p2 = this.anchorToPixel(state.anchors[1], viewport);
    const { chartRect } = viewport;

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) return;

    const maxDist = Math.hypot(chartRect.width, chartRect.height) * 2;
    const startX = p1.x - (dx / len) * maxDist;
    const startY = p1.y - (dy / len) * maxDist;
    const endX = p1.x + (dx / len) * maxDist;
    const endY = p1.y + (dy / len) * maxDist;

    this.applyLineStyle(ctx, state.style);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    this.resetLineStyle(ctx);
    drawLineStats(ctx, state, viewport, [p1, p2], selected, this.optionsOf(state));
    this.texts.set(state.id, drawLineText(ctx, state.style, { x: startX, y: startY }, { x: endX, y: endY }, chartRect));
    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  priceAt(state: DrawingState, time: number, viewport?: ViewportState): number[] | null {
    if (state.anchors.length < 2) return null;
    const price = this.linePriceAt(state.anchors[0], state.anchors[1], time, true, true, lineSpace(viewport));
    return price === null ? null : [price];
  }

  /** Its text's box as last drawn: a click on the words picks it. */
  private texts = new TextHitCache();

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    return this.texts.hit(state.id, point, tolerance) || this.hitShape(point, state, viewport, tolerance);
  }

  private hitShape(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    const p1 = this.anchorToPixel(state.anchors[0], viewport);
    const p2 = this.anchorToPixel(state.anchors[1], viewport);
    return this.distanceToInfiniteLine(point, p1, p2) <= tolerance;
  }
}
