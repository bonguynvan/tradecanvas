import type { Theme } from '@tradecanvas/commons';
import { crispBox } from '../charts/pixelGrid.js';

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

/**
 * Where the words of a tag on the price axis start, from the tag's left edge
 * (a pixel in from the axis line): under the scale's own labels, so every
 * price down the axis is in one column, whatever wrote it.
 */
export const AXIS_TAG_TEXT_INSET = 7;

/**
 * Fill a tag's box in the theme's corner shape, with the context's current
 * fill, its edges on whole device pixels (see `crispBox`).
 */
export function fillTag(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, theme: Theme): void {
  const box = crispBox(ctx, x, y, w, h);
  if (!(cornerRadius(theme, box.w, box.h) > 0)) {
    ctx.fillRect(box.x, box.y, box.w, box.h);
    return;
  }
  tagPath(ctx, box.x, box.y, box.w, box.h, theme);
  ctx.fill();
}
