/**
 * Drawing on whole device pixels. The chart draws in CSS pixels under the
 * device-pixel-ratio transform, so a 1 px line at a fractional position
 * spreads over two device pixels at half strength and looks soft and thick.
 * Bars drawn here go back to the canvas's own pixels and round to them: a
 * wick is one sharp column, a body has hard edges, at any ratio (1, 1.25, 2…).
 */

/**
 * Rounding to a device pixel turns up from a hair under the half. Bar steps
 * are often round numbers (5.1 px, say) that put bars exactly on half a
 * pixel, where 64-bit arithmetic here and 32-bit on the GPU would round some
 * of them apart; a hair under, both land on the same side. The shaders use
 * the same constant.
 */
export const PIXEL_ROUNDING = 0.5037;

/** The device pixel a device-pixel position rounds to. */
export function toPixel(v: number): number {
  return Math.floor(v + PIXEL_ROUNDING);
}

function transformOf(ctx: CanvasRenderingContext2D): { a: number; d: number; e: number; f: number } {
  const m = typeof ctx.getTransform === 'function' ? ctx.getTransform() : undefined;
  return {
    a: m && Number.isFinite(m.a) && m.a > 0 ? m.a : 1,
    d: m && Number.isFinite(m.d) && m.d > 0 ? m.d : 1,
    e: m && Number.isFinite(m.e) ? m.e : 0,
    f: m && Number.isFinite(m.f) ? m.f : 0,
  };
}

/** CSS to device-pixel mapping, rounded to whole pixels. */
export interface PixelGrid {
  /** Device pixels per CSS pixel. */
  ratio: number;
  /** The device pixel a CSS x falls on. */
  x(cssX: number): number;
  /** The device pixel a CSS y falls on. */
  y(cssY: number): number;
  /**
   * Left edge (device px) of a column `width` device pixels wide centred on
   * CSS x `cssCenter`: the same column `crispX` strokes for a line there.
   */
  left(cssCenter: number, width: number): number;
}

/**
 * Run `draw` with the transform reset to device pixels, then put it back.
 * A context without a readable transform (a test stand-in) is taken as 1:1.
 */
export function inDevicePixels<T>(ctx: CanvasRenderingContext2D, draw: (grid: PixelGrid) => T): T {
  const { a, d, e, f } = transformOf(ctx);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  try {
    return draw({
      ratio: a,
      x: (v) => toPixel(v * a + e),
      y: (v) => toPixel(v * d + f),
      left: (v, width) => toPixel(v * a + e - width / 2),
    });
  } finally {
    ctx.restore();
  }
}

/**
 * A bar's columns in device pixels: the wick one CSS pixel wide (at least one
 * device pixel), the body about the bar's width, with an even difference so
 * the wick sits exactly in the middle.
 */
export function barColumns(barWidth: number, ratio: number): { body: number; wick: number } {
  const wick = Math.max(1, Math.floor(ratio));
  let body = Math.max(wick, Math.round(barWidth * ratio));
  if ((body - wick) % 2 !== 0) body -= 1;
  return { body: Math.max(body, wick), wick };
}

/** Under a whole number by less than this, a width in device pixels is that number (1.1 × 10 is 11, not 10.999…). */
const WIDTH_NOISE = 1e-6;

/**
 * Snap a line's centre (in CSS px) so a `width`-wide stroke covers whole
 * device pixels. The width goes down to them, never under one: a 1 px line is
 * one device pixel at 1.25 and at 1.5, as the browser draws a 1 px border and
 * as a bar's wick is, not one at 1.25 and two at 1.5.
 */
function snap(v: number, width: number, scale: number, shift: number): { at: number; width: number } {
  const w = Math.max(1, Math.floor(width * scale + WIDTH_NOISE));
  const half = w % 2 ? 0.5 : 0;
  return { at: (toPixel(v * scale + shift - half) + half - shift) / scale, width: w / scale };
}

/**
 * A horizontal line's y and width, snapped so the stroke covers whole device
 * pixels: one sharp row instead of a soft two-pixel smear.
 */
export function crispY(ctx: CanvasRenderingContext2D, y: number, width: number): { y: number; width: number } {
  const t = transformOf(ctx);
  const s = snap(y, width, t.d, t.f);
  return { y: s.at, width: s.width };
}

/**
 * Add a horizontal hairline to the path: from `x1` to `x2` at `y` (its
 * centre in CSS px, `Math.round(y) + 0.5` at 1 px), on whole device pixels at
 * any ratio. It sets the line width too: 1 CSS px is 1.25 or 1.5 device pixels
 * on a screen scaled so, and a line that wide has soft edges wherever it lies.
 */
export function hLine(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number, width = 1): void {
  const row = crispY(ctx, y, width);
  ctx.lineWidth = row.width;
  ctx.moveTo(x1, row.y);
  ctx.lineTo(x2, row.y);
}

/** Add a vertical hairline to the path, from `y1` to `y2` at `x`, as `hLine` does. */
export function vLine(ctx: CanvasRenderingContext2D, x: number, y1: number, y2: number, width = 1): void {
  const column = crispX(ctx, x, width);
  ctx.lineWidth = column.width;
  ctx.moveTo(column.x, y1);
  ctx.lineTo(column.x, y2);
}

/**
 * A filled box with its four edges on whole device pixels, where the ratio is
 * a fraction (1.25, 1.5): a tag's flat sides are then hard, not a row of half
 * colour. At a whole ratio the box is left exactly as given.
 */
export function crispBox(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): { x: number; y: number; w: number; h: number } {
  const t = transformOf(ctx);
  if (Number.isInteger(t.a) && Number.isInteger(t.d)) return { x, y, w, h };
  const edge = (v: number, scale: number, shift: number) => (toPixel(v * scale + shift) - shift) / scale;
  const left = edge(x, t.a, t.e);
  const top = edge(y, t.d, t.f);
  return { x: left, y: top, w: edge(x + w, t.a, t.e) - left, h: edge(y + h, t.d, t.f) - top };
}

/** A vertical line's x and width, snapped like `crispY`. */
export function crispX(ctx: CanvasRenderingContext2D, x: number, width: number): { x: number; width: number } {
  const t = transformOf(ctx);
  const s = snap(x, width, t.a, t.e);
  return { x: s.at, width: s.width };
}
