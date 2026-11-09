import type { AnchorPoint, Point, ViewportState } from '@tradecanvas/commons';
import { priceToY, timeToX, xToTime, yToPrice } from '../viewport/ScaleMapping.js';

/** Shift keeps a line at a multiple of this angle on screen. */
const SNAP_ANGLE = Math.PI / 4;

/**
 * The tools whose points Shift keeps at 45° steps from the point before:
 * lines and paths. A box, a channel's width or a pitchfork's handle has
 * points that mean something else, and stays free.
 */
const ANGLE_TOOLS: ReadonlySet<string> = new Set([
  'trendLine', 'ray', 'extendedLine', 'infoLine', 'trendAngle', 'arrow', 'horizontalRay',
  'measure', 'priceRange', 'dateRange', 'dateAndPriceRange', 'path', 'polyline',
  'fibRetracement', 'fibExtension',
]);

/** Whether Shift keeps `type`'s points at 45° steps (see `ANGLE_TOOLS`). */
export function keepsAngle(type: string): boolean {
  return ANGLE_TOOLS.has(type);
}

/**
 * `to`, turned about `from` to the nearest multiple of 45° on screen: flat,
 * upright or diagonal, as far along that direction as the pointer reaches.
 * Measured in pixels, so it holds on any zoom and on a log scale.
 */
export function constrainAngle(from: Point, to: Point): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) return to;
  const angle = Math.round(Math.atan2(dy, dx) / SNAP_ANGLE) * SNAP_ANGLE;
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  // The pointer projected on the direction, so a near-flat drag keeps its length.
  const along = dx * ux + dy * uy;
  return { x: from.x + clean(along * ux), y: from.y + clean(along * uy) };
}

/** Rounding noise of cos and sin, so a flat line is exactly flat. */
function clean(v: number): number {
  return Math.abs(v) < 1e-9 ? 0 : v;
}

/**
 * The anchor for the pointer at `pos` with Shift held: at 45° steps from
 * `from`. Flat keeps `from`'s price and upright its time exactly, so the
 * line is not a hair off from rounding. A diagonal's time lands on a bar,
 * and its price follows that bar, so the line stays at 45°.
 */
export function constrainedAnchor(from: AnchorPoint, pos: Point, viewport: ViewportState): AnchorPoint {
  const start = anchorToPoint(from, viewport);
  const to = constrainAngle(start, pos);
  if (to.x === start.x) return { time: from.time, price: yToPrice(to.y, viewport) };
  const time = xToTime(to.x, viewport);
  if (to.y === start.y) return { time, price: from.price };
  const across = timeToX(time, viewport) - start.x;
  return { time, price: yToPrice(start.y + Math.sign(to.y - start.y) * Math.abs(across), viewport) };
}

/** Where an anchor is on screen. */
export function anchorToPoint(anchor: AnchorPoint, viewport: ViewportState): Point {
  return { x: timeToX(anchor.time, viewport), y: priceToY(anchor.price, viewport) };
}

/** The index of the anchor nearest `pos` on screen, or -1 when there are none. */
export function nearestAnchor(anchors: readonly AnchorPoint[], pos: Point, viewport: ViewportState): number {
  let best = -1;
  let bestDistance = Infinity;
  anchors.forEach((a, i) => {
    const p = anchorToPoint(a, viewport);
    const distance = Math.hypot(p.x - pos.x, p.y - pos.y);
    if (distance < bestDistance) {
      best = i;
      bestDistance = distance;
    }
  });
  return best;
}
