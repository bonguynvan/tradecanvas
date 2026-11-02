import type { DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';
import { priceToY } from '../../viewport/ScaleMapping.js';
import { formatDrawingPrice, fillLevelLabel } from './labels.js';
import { drawLineText, TextHitCache } from './lineText.js';
import { SHOW_PRICE_OPTION } from './options.js';

export class HorizontalLineTool extends DrawingBase {
  descriptor = { type: 'horizontalLine' as const, name: 'Horizontal Line', requiredAnchors: 1, text: true, options: SHOW_PRICE_OPTION };

  priceAt(state: DrawingState): number[] | null {
    return state.anchors.length < 1 ? null : [state.anchors[0].price];
  }

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 1) return;
    const y = priceToY(state.anchors[0].price, viewport);
    const { chartRect } = viewport;
    this.applyLineStyle(ctx, state.style);
    this.strokeHorizontal(ctx, chartRect.x, chartRect.x + chartRect.width, y);
    this.resetLineStyle(ctx);

    // The text first: the price label keeps clear of it.
    this.texts.set(state.id, drawLineText(ctx, state.style, { x: chartRect.x, y }, { x: chartRect.x + chartRect.width, y }));
    // Price label, at the line's start or, under the legend, its end.
    if (this.option<boolean>(state, 'showPrice')) {
      ctx.fillStyle = state.style.color;
      fillLevelLabel(ctx, formatDrawingPrice(state.anchors[0].price, state.anchors[0].price, viewport), chartRect.x, y, chartRect.x + chartRect.width, chartRect.y);
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
    const y = priceToY(state.anchors[0].price, viewport);
    return Math.abs(point.y - y) <= tolerance && point.x >= viewport.chartRect.x && point.x <= viewport.chartRect.x + viewport.chartRect.width;
  }
}
