import type { DrawingState, Point, ViewportState } from '@chart-lib/commons';
import { DrawingBase } from '../DrawingBase.js';
import { priceToY } from '../../viewport/ScaleMapping.js';

const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

export class FibRetracementTool extends DrawingBase {
  descriptor = { type: 'fibRetracement' as const, name: 'Fibonacci Retracement', requiredAnchors: 2 };

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    const p1 = this.anchorToPixel(state.anchors[0], viewport);
    const p2 = this.anchorToPixel(state.anchors[1], viewport);
    const { chartRect } = viewport;
    const priceHigh = state.anchors[0].price;
    const priceLow = state.anchors[1].price;
    const priceRange = priceHigh - priceLow;

    ctx.font = '11px sans-serif';
    ctx.textBaseline = 'middle';

    for (const level of FIB_LEVELS) {
      const price = priceLow + priceRange * (1 - level);
      const y = priceToY(price, viewport);

      this.applyLineStyle(ctx, state.style);
      ctx.globalAlpha = level === 0 || level === 1 ? 1 : 0.7;
      ctx.beginPath();
      ctx.moveTo(chartRect.x, y);
      ctx.lineTo(chartRect.x + chartRect.width, y);
      ctx.stroke();

      // Label
      ctx.fillStyle = state.style.color;
      ctx.textAlign = 'left';
      ctx.fillText(`${(level * 100).toFixed(1)}% (${price.toFixed(2)})`, chartRect.x + 4, y - 2);
    }

    ctx.globalAlpha = 1;

    // Fill between levels
    if (state.style.fillColor) {
      for (let i = 0; i < FIB_LEVELS.length - 1; i++) {
        const priceA = priceLow + priceRange * (1 - FIB_LEVELS[i]);
        const priceB = priceLow + priceRange * (1 - FIB_LEVELS[i + 1]);
        const yA = priceToY(priceA, viewport);
        const yB = priceToY(priceB, viewport);
        ctx.fillStyle = state.style.fillColor;
        ctx.globalAlpha = 0.05 + i * 0.02;
        ctx.fillRect(chartRect.x, Math.min(yA, yB), chartRect.width, Math.abs(yB - yA));
      }
      ctx.globalAlpha = 1;
    }

    this.resetLineStyle(ctx);
    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    const p1 = this.anchorToPixel(state.anchors[0], viewport);
    const p2 = this.anchorToPixel(state.anchors[1], viewport);
    const { chartRect } = viewport;
    if (point.x < chartRect.x - tolerance || point.x > chartRect.x + chartRect.width + tolerance) return false;
    const priceHigh = state.anchors[0].price;
    const priceLow = state.anchors[1].price;
    const priceRange = priceHigh - priceLow;
    for (const level of FIB_LEVELS) {
      const price = priceLow + priceRange * (1 - level);
      const y = priceToY(price, viewport);
      if (Math.abs(point.y - y) <= tolerance) return true;
    }
    return false;
  }
}
