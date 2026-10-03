import type { DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';
import { priceToY } from '../../viewport/ScaleMapping.js';
import { formatDrawingPrice, drawingFont, fillTextWithHalo } from './labels.js';

export class HorizontalLineTool extends DrawingBase {
  descriptor = { type: 'horizontalLine' as const, name: 'Horizontal Line', requiredAnchors: 1 };

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

    // Price label
    ctx.fillStyle = state.style.color;
    ctx.font = drawingFont(11);
    ctx.textBaseline = 'bottom';
    fillTextWithHalo(ctx, formatDrawingPrice(state.anchors[0].price, state.anchors[0].price, viewport), chartRect.x + 4, y - 3);

    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 1) return false;
    const y = priceToY(state.anchors[0].price, viewport);
    return Math.abs(point.y - y) <= tolerance && point.x >= viewport.chartRect.x && point.x <= viewport.chartRect.x + viewport.chartRect.width;
  }
}
