import type { AnchorPoint, DrawingDescriptor, Point, ViewportState } from '@tradecanvas/commons';

/**
 * A drawing kept to a place on the screen (`DrawingDescriptor.anchoring:
 * 'screen'`) holds each point as its share of its pane's plot: `time` across
 * from the left edge, `price` down from the top, each 0 to 1. Scrolling,
 * zooming, another interval or another symbol leave it where it is.
 */

/** Whether drawings of a tool are kept to the screen rather than to bars and prices. */
export function isScreenAnchored(descriptor: Pick<DrawingDescriptor, 'anchoring'> | null | undefined): boolean {
  return descriptor?.anchoring === 'screen';
}

/**
 * How far in from the plot's right, top and bottom edges a screen point is
 * drawn at most (px): its text starts there and runs right, and a note's
 * pin stands above it, so some of it stays in sight and in reach.
 */
const SCREEN_INSET = 24;

/** `v` kept between `min` and `max`; `min` when the room is less than nothing. */
function within(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(v, Math.max(min, max)));
}

/** Where a screen point shows on the plot, in pixels: at its share, kept in from the edges its text would run off. */
export function screenPointToPixel(anchor: AnchorPoint, viewport: ViewportState): Point {
  const plot = viewport.chartRect;
  return {
    x: within(plot.x + anchor.time * plot.width, plot.x, plot.x + plot.width - SCREEN_INSET),
    y: within(plot.y + anchor.price * plot.height, plot.y + SCREEN_INSET, plot.y + plot.height - SCREEN_INSET),
  };
}

/** Screen points as kept: each share between 0 and 1 (one given as a time and a price lands on an edge). */
export function clampScreenPoints(anchors: readonly AnchorPoint[]): AnchorPoint[] {
  const keep = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);
  return anchors.map((a) => ({ time: keep(a.time), price: keep(a.price) }));
}

/** The screen point at a pixel, kept on the plot. */
export function pixelToScreenPoint(point: Point, viewport: ViewportState): AnchorPoint {
  const plot = viewport.chartRect;
  const share = (v: number, size: number) => (size > 0 ? Math.min(1, Math.max(0, v / size)) : 0);
  return { time: share(point.x - plot.x, plot.width), price: share(point.y - plot.y, plot.height) };
}

/** Screen points moved `dx` and `dy` pixels, kept on the plot. */
export function shiftScreenPoints(anchors: readonly AnchorPoint[], dx: number, dy: number, viewport: ViewportState): AnchorPoint[] {
  return anchors.map((a) => {
    const p = screenPointToPixel(a, viewport);
    return pixelToScreenPoint({ x: p.x + dx, y: p.y + dy }, viewport);
  });
}

/**
 * Screen points moved by a share of the plot each way (a pasted copy's
 * offset): right and down, or back left and up where that would run off the
 * plot, so a copy never lands on its original at an edge.
 */
export function offsetScreenPoints(anchors: readonly AnchorPoint[], share: number): AnchorPoint[] {
  const away = (v: number) => Math.min(1, Math.max(0, v + share <= 1 ? v + share : v - share));
  return anchors.map((a) => ({ time: away(a.time), price: away(a.price) }));
}
