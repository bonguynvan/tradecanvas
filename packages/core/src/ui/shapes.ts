import type { Theme } from '@tradecanvas/commons';

/**
 * Fill a tag's box (a price tag, an axis pill, an order badge) in the
 * theme's corner shape: square by default, rounded by `theme.shape.tagRadius`
 * (999 or anything past half its height makes a pill). Uses the context's
 * current fill.
 */
export function fillTag(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, theme: Theme): void {
  const radius = theme.shape?.tagRadius;
  const r = typeof radius === 'number' && Number.isFinite(radius) ? Math.max(0, Math.min(radius, h / 2, w / 2)) : 0;
  if (!(r > 0)) {
    ctx.fillRect(x, y, w, h);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  ctx.fill();
}
