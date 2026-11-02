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

/** Where a screen point shows on the plot, in pixels. */
export function screenPointToPixel(anchor: AnchorPoint, viewport: ViewportState): Point {
  const plot = viewport.chartRect;
  return { x: plot.x + anchor.time * plot.width, y: plot.y + anchor.price * plot.height };
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

/** Screen points moved by a share of the plot each way (a pasted copy's offset), kept on it. */
export function offsetScreenPoints(anchors: readonly AnchorPoint[], share: number): AnchorPoint[] {
  const keep = (v: number) => Math.min(1, Math.max(0, v));
  return anchors.map((a) => ({ time: keep(a.time + share), price: keep(a.price + share) }));
}
