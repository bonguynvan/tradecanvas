import type { IconDef } from '@tradecanvas/commons';
import { ICON_DOT_RADIUS, ICON_SOFT_OPACITY } from '@tradecanvas/commons';

/** The icon set's grid and stroke (see `iconSvg`). */
const GRID = 24;
const STROKE = 1.75;
const DASH = [2, 2.5];

/** Each path's `Path2D`, built once: icons are drawn every frame. */
const paths = new Map<string, Path2D>();
const path = (d: string): Path2D => {
  let p = paths.get(d);
  if (!p) {
    p = new Path2D(d);
    paths.set(d, p);
  }
  return p;
};

/**
 * An icon of the TradeCanvas set on a canvas, `size` px square with its
 * top-left at `x`, `y`, in `color`: the same strokes, fills, dashes and dots
 * as the widget's inline SVG, so the chart's own labels carry the same icons.
 * Placed on whole pixels, with strokes no thinner than a pixel, so it stays
 * sharp at label sizes. Nothing where the canvas has no `Path2D`.
 */
export function drawIcon(ctx: CanvasRenderingContext2D, icon: IconDef, x: number, y: number, size: number, color: string): void {
  if (typeof Path2D === 'undefined') return;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(size / GRID, size / GRID);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  // Below 24 px the set's stroke would fall under a pixel and blur.
  ctx.lineWidth = Math.max(STROKE, GRID / size);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([]);
  if (icon.soft) {
    const alpha = ctx.globalAlpha;
    ctx.globalAlpha = alpha * ICON_SOFT_OPACITY;
    ctx.fill(path(icon.soft));
    ctx.globalAlpha = alpha;
  }
  for (const f of icon.fills ?? []) ctx.fill(path(f));
  if (icon.d) ctx.stroke(path(icon.d));
  if (icon.dash) {
    ctx.setLineDash(DASH);
    ctx.stroke(path(icon.dash));
    ctx.setLineDash([]);
  }
  for (const [cx, cy, r = ICON_DOT_RADIUS] of icon.dots ?? []) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
