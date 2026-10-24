import type { Theme } from '@tradecanvas/commons';

/** The corner radius a tag `w` by `h` takes from the theme: none it can't use, half its side at most. */
function cornerRadius(theme: Theme, w: number, h: number): number {
  const radius = theme.shape?.tagRadius;
  return typeof radius === 'number' && Number.isFinite(radius) ? Math.max(0, Math.min(radius, h / 2, w / 2)) : 0;
}

/**
 * Trace a tag's box (a price tag, an axis pill, an order badge) in the
 * theme's corner shape: square by default, rounded by `theme.shape.tagRadius`
 * (999 or anything past half its height makes a pill). Starts a new path, to
 * fill or to clip to.
 */
export function tagPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, theme: Theme): void {
  const r = cornerRadius(theme, w, h);
  ctx.beginPath();
  if (!(r > 0)) {
    ctx.rect(x, y, w, h);
    return;
  }
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
}

/** Fill a tag's box in the theme's corner shape, with the context's current fill. */
export function fillTag(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, theme: Theme): void {
  if (!(cornerRadius(theme, w, h) > 0)) {
    ctx.fillRect(x, y, w, h);
    return;
  }
  tagPath(ctx, x, y, w, h, theme);
  ctx.fill();
}
