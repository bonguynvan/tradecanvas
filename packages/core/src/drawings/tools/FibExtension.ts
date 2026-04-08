import type { DrawingState, Point, ViewportState } from '@chart-lib/commons';
import { DrawingBase } from '../DrawingBase.js';
import { priceToY } from '../../viewport/ScaleMapping.js';

const EXT_LEVELS = [0, 0.618, 1, 1.618, 2, 2.618, 3.618, 4.236];

export class FibExtensionTool extends DrawingBase {
  descriptor = { type: 'fibExtension' as const, name: 'Fibonacci Extension', requiredAnchors: 3 };

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 3) {
      if (state.anchors.length === 2) {
        const p1 = this.anchorToPixel(state.anchors[0], viewport);
        const p2 = this.anchorToPixel(state.anchors[1], viewport);
        this.applyLineStyle(ctx, state.style);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        this.resetLineStyle(ctx);
      }
      return;
    }

    const { chartRect } = viewport;
    const priceA = state.anchors[0].price;
    const priceB = state.anchors[1].price;
    const priceC = state.anchors[2].price;
    const swing = priceA - priceB;

    ctx.font = '11px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    for (const level of EXT_LEVELS) {
      const price = priceC + swing * level;
      const y = priceToY(price, viewport);

      this.applyLineStyle(ctx, state.style);
      ctx.globalAlpha = level === 0 || level === 1 ? 1 : 0.6;
      ctx.beginPath();
      ctx.moveTo(chartRect.x, y);
      ctx.lineTo(chartRect.x + chartRect.width, y);
      ctx.stroke();

      ctx.fillStyle = state.style.color;
      ctx.fillText(`${(level * 100).toFixed(1)}%`, chartRect.x + 4, y - 2);
    }

    ctx.globalAlpha = 1;
    this.resetLineStyle(ctx);
    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 3) return false;
    const { chartRect } = viewport;
    if (point.x < chartRect.x - tolerance || point.x > chartRect.x + chartRect.width + tolerance) return false;
    const swing = state.anchors[0].price - state.anchors[1].price;
    for (const level of EXT_LEVELS) {
      const price = state.anchors[2].price + swing * level;
      const y = priceToY(price, viewport);
      if (Math.abs(point.y - y) <= tolerance) return true;
    }
    return false;
  }
}
