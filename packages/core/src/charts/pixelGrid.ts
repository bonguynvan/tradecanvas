/**
 * Drawing on whole device pixels. The chart draws in CSS pixels under the
 * device-pixel-ratio transform, so a 1 px line at a fractional position
 * spreads over two device pixels at half strength and looks soft and thick.
 * Bars drawn here go back to the canvas's own pixels and round to them: a
 * wick is one sharp column, a body has hard edges, at any ratio (1, 1.25, 2…).
 */

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
      x: (v) => Math.round(v * a + e),
      y: (v) => Math.round(v * d + f),
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

/** Snap a line's centre (in CSS px) so a `width`-wide stroke covers whole device pixels. */
function snap(v: number, width: number, scale: number, shift: number): { at: number; width: number } {
  const w = Math.max(1, Math.round(width * scale));
  const half = w % 2 ? 0.5 : 0;
  return { at: (Math.round(v * scale + shift - half) + half - shift) / scale, width: w / scale };
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

/** A vertical line's x and width, snapped like `crispY`. */
export function crispX(ctx: CanvasRenderingContext2D, x: number, width: number): { x: number; width: number } {
  const t = transformOf(ctx);
  const s = snap(x, width, t.a, t.e);
  return { x: s.at, width: s.width };
}
