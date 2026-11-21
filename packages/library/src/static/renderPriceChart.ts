import { FrameRenderer } from '@tradecanvas/core';
import { checkOptions } from './checkOptions.js';
import { PriceFrame, type PriceFrameOptions } from './PriceFrame.js';

type Context2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/**
 * Draws a price chart on a 2D context of your own, with no page: a canvas
 * made in Node (`@napi-rs/canvas`, `skia-canvas`) for a picture in an email,
 * a report or a message from a bot, or an OffscreenCanvas in a worker. The
 * bars, the chart type, volume, both axes, the legend, indicators on the
 * price pane and in panes of their own, drawings and buy and sell marks are
 * drawn as `Chart` draws them; `options` name them as `Chart`'s do, and
 * `options.plugins` are its plugins (an indicator, a chart type, a drawing
 * tool or an overlay of your own).
 *
 * It draws `size.width` × `size.height` in the context's own units, over the
 * theme's ground: scale the context first for a picture of more pixels,
 * `ctx.scale(2, 2)` for twice as many each way. It is one frame: nothing
 * follows a pointer. Every bar given is on view when they fit, the newest
 * ones when they do not, and `visibleRange` names others.
 *
 * The bars are drawn with `Path2D`, which Node has none of: give your canvas
 * library's as `options.path2D` there.
 *
 * What is wrong with the options is said before anything is drawn: a
 * RangeError for an indicator, a theme or a time zone it does not know and
 * for a number outside what it can be, a TypeError for an option that is
 * the wrong kind of thing, for no context, and where there is no `Path2D`
 * at all. A size that is none draws nothing. The context is left as it was
 * found; should a plugin of yours throw while it draws, use another.
 */
export function renderPriceChart(ctx: Context2D, options: PriceFrameOptions, size: { width: number; height: number }): void {
  // What is no chart at all is said at once: further in, it would fail somewhere that names none of it.
  if (!ctx || typeof ctx.fillRect !== 'function') throw new TypeError('renderPriceChart: the first argument is the 2D context to draw on.');
  if (!options || typeof options !== 'object') throw new TypeError('renderPriceChart: options is an object, with the bars as its data.');
  checkOptions(options);
  if (!size || !isSize(size.width) || !isSize(size.height)) return;
  // An OffscreenCanvas's context draws as a canvas's does; only what ties a canvas to its page is missing from it.
  const c = ctx as CanvasRenderingContext2D;
  withPath2D(options.path2D, () => {
    const frame = new PriceFrame(options, size, (text, font) => measureWith(c, text, font));
    // The context is the caller's: its fill, its font and its clip are theirs again when this returns, or throws.
    c.save();
    try {
      frame.prepare(c);
      c.fillStyle = frame.background();
      c.fillRect(0, 0, size.width, size.height);
      new FrameRenderer().drawFrame(c, frame.context());
    } finally {
      c.restore();
    }
  });
}

/** A side a chart can be drawn at: a number above 0 that is not without end. */
const isSize = (side: unknown): side is number => typeof side === 'number' && Number.isFinite(side) && side > 0;

/** The width of `text` in `font` on `ctx`, which keeps the font it had. */
function measureWith(ctx: CanvasRenderingContext2D, text: string, font: string): number {
  const before = ctx.font;
  ctx.font = font;
  const { width } = ctx.measureText(text);
  ctx.font = before;
  return width;
}

/**
 * Runs `draw` with `given` as the global `Path2D` the chart's bars are
 * drawn with, and puts back what was there: the drawing is done when this
 * returns, so nothing else sees it.
 */
function withPath2D(given: typeof Path2D | undefined, draw: () => void): void {
  const host = globalThis as { Path2D?: typeof Path2D };
  if (!given) {
    if (typeof host.Path2D !== 'function') {
      throw new TypeError('renderPriceChart: there is no Path2D here. Give your canvas library\'s as options.path2D (import { Path2D } from \'@napi-rs/canvas\').');
    }
    draw();
    return;
  }
  const had = Object.prototype.hasOwnProperty.call(host, 'Path2D');
  const before = host.Path2D;
  host.Path2D = given;
  try {
    draw();
  } finally {
    if (had) host.Path2D = before;
    else delete host.Path2D;
  }
}
