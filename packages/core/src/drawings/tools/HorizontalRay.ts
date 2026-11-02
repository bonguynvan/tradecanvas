import type { DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';
import { formatDrawingPrice, fillLevelLabel } from './labels.js';
import { drawLineText, TextHitCache } from './lineText.js';
import { SHOW_PRICE_OPTION } from './options.js';

/**
 * A horizontal line that only extends forward in time from its anchor —
 * unlike `horizontalLine`, which spans the full chart width. Useful for
 * marking a level ("support starts here") without implying it held in the
 * past too.
 */
export class HorizontalRayTool extends DrawingBase {
  descriptor = { type: 'horizontalRay' as const, name: 'Horizontal Ray', requiredAnchors: 1, text: true, options: SHOW_PRICE_OPTION };

  priceAt(state: DrawingState, time: number): number[] | null {
    if (state.anchors.length < 1 || time < state.anchors[0].time) return null;
    return [state.anchors[0].price];
  }

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 1) return;
    const anchor = this.anchorToPixel(state.anchors[0], viewport);
    const y = anchor.y;
    const { chartRect } = viewport;
    this.applyLineStyle(ctx, state.style);
    this.strokeHorizontal(ctx, anchor.x, chartRect.x + chartRect.width, y);
    this.resetLineStyle(ctx);

    // The text first: the price label keeps clear of it.
    this.texts.set(state.id, drawLineText(ctx, state.style, anchor, { x: chartRect.x + chartRect.width, y }, chartRect));
    if (this.option<boolean>(state, 'showPrice')) {
      ctx.fillStyle = state.style.color;
      fillLevelLabel(ctx, formatDrawingPrice(state.anchors[0].price, state.anchors[0].price, viewport), anchor.x, y, chartRect.x + chartRect.width, chartRect.y);
    }

    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  /** Its text's box as last drawn: a click on the words picks it. */
  private texts = new TextHitCache();

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    return this.texts.hit(state.id, point, tolerance) || this.hitShape(point, state, viewport, tolerance);
  }

  private hitShape(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 1) return false;
    const anchor = this.anchorToPixel(state.anchors[0], viewport);
    return (
      Math.abs(point.y - anchor.y) <= tolerance &&
      point.x >= anchor.x - tolerance &&
      point.x <= viewport.chartRect.x + viewport.chartRect.width
    );
  }
}
