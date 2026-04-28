import type { DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';

/**
 * Pull annotation text from `style.text`, then `meta.text`, then a literal default.
 * Pure helper — exported so it can be unit-tested without a canvas.
 */
export function resolveAnnotationText(state: DrawingState, fallback = 'Text'): string {
  if (typeof state.style.text === 'string' && state.style.text.length > 0) {
    return state.style.text;
  }
  const metaText = state.meta?.text;
  if (typeof metaText === 'string' && metaText.length > 0) return metaText;
  return fallback;
}

export class TextAnnotationTool extends DrawingBase {
  descriptor = { type: 'text' as const, name: 'Text', requiredAnchors: 1 };

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 1) return;
    const p = this.anchorToPixel(state.anchors[0], viewport);
    const text = resolveAnnotationText(state);
    const fontSize = state.style.fontSize || 14;

    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillStyle = state.style.color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    if (selected) {
      const metrics = ctx.measureText(text);
      ctx.strokeStyle = state.style.color;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(p.x - 2, p.y - 2, metrics.width + 4, fontSize + 4);
      ctx.setLineDash([]);
    }

    ctx.fillText(text, p.x, p.y);
    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 1) return false;
    const p = this.anchorToPixel(state.anchors[0], viewport);
    const fontSize = state.style.fontSize || 14;
    const textWidth = 80; // approximate
    return point.x >= p.x - tolerance && point.x <= p.x + textWidth + tolerance && point.y >= p.y - tolerance && point.y <= p.y + fontSize + tolerance;
  }
}
