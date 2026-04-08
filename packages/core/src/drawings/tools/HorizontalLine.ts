import type { DrawingState, Point, ViewportState } from '@chart-lib/commons';
import { DrawingBase } from '../DrawingBase.js';
import { priceToY } from '../../viewport/ScaleMapping.js';

export class HorizontalLineTool extends DrawingBase {
  descriptor = { type: 'horizontalLine' as const, name: 'Horizontal Line', requiredAnchors: 1 };

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 1) return;
    const y = priceToY(state.anchors[0].price, viewport);
    const { chartRect } = viewport;
    this.applyLineStyle(ctx, state.style);
    ctx.beginPath();
    ctx.moveTo(chartRect.x, y);
    ctx.lineTo(chartRect.x + chartRect.width, y);
    ctx.stroke();
    this.resetLineStyle(ctx);

    // Price label
    ctx.fillStyle = state.style.color;
    ctx.font = '11px sans-serif';
    ctx.textBaseline = 'bottom';
    ctx.fillText(state.anchors[0].price.toFixed(2), chartRect.x + 4, y - 3);

    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 1) return false;
    const y = priceToY(state.anchors[0].price, viewport);
    return Math.abs(point.y - y) <= tolerance && point.x >= viewport.chartRect.x && point.x <= viewport.chartRect.x + viewport.chartRect.width;
  }
}
