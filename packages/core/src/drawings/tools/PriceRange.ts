import type { DrawingState, Point, ViewportState } from '@chart-lib/commons';
import { DrawingBase } from '../DrawingBase.js';

export class PriceRangeTool extends DrawingBase {
  descriptor = { type: 'priceRange' as const, name: 'Price Range', requiredAnchors: 2 };

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    const p1 = this.anchorToPixel(state.anchors[0], viewport);
    const p2 = this.anchorToPixel(state.anchors[1], viewport);
    const x = Math.min(p1.x, p2.x), w = Math.abs(p2.x - p1.x);
    const top = Math.min(p1.y, p2.y), h = Math.abs(p2.y - p1.y);

    // Fill
    const isUp = state.anchors[1].price > state.anchors[0].price;
    ctx.fillStyle = isUp ? 'rgba(38, 166, 154, 0.15)' : 'rgba(239, 83, 80, 0.15)';
    ctx.fillRect(x, top, w, h);

    this.applyLineStyle(ctx, state.style);
    ctx.strokeRect(x, top, w, h);
    this.resetLineStyle(ctx);

    // Label
    const priceDiff = state.anchors[1].price - state.anchors[0].price;
    const pctChange = state.anchors[0].price !== 0 ? (priceDiff / state.anchors[0].price * 100) : 0;
    const label = `${priceDiff >= 0 ? '+' : ''}${priceDiff.toFixed(2)} (${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(2)}%)`;

    ctx.font = '12px sans-serif';
    ctx.fillStyle = isUp ? '#26A69A' : '#EF5350';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, top + h / 2);

    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    const p1 = this.anchorToPixel(state.anchors[0], viewport);
    const p2 = this.anchorToPixel(state.anchors[1], viewport);
    const x1 = Math.min(p1.x, p2.x), x2 = Math.max(p1.x, p2.x);
    const y1 = Math.min(p1.y, p2.y), y2 = Math.max(p1.y, p2.y);
    return point.x >= x1 - tolerance && point.x <= x2 + tolerance && point.y >= y1 - tolerance && point.y <= y2 + tolerance;
  }
}
