import type { DrawingDescriptor, DrawingState, ViewportState } from '@tradecanvas/commons';

/** Where a drawing lies on the axes: its lowest and highest price, its first and last time. */
export interface AxisExtent {
  /** Lowest first; one value when they are the same, none when the drawing spans no price. */
  prices: number[];
  /** Earliest first; one value when they are the same, none when the drawing spans no time. */
  times: number[];
}

/** A drawing's span to mark on the axes, in its colour, on the viewport it is drawn on (a pane's). */
export interface AxisSpan extends AxisExtent {
  color: string;
  viewport: ViewportState;
}

/** The lowest and the highest of `values`, or the one when they are the same. */
function ends(values: readonly number[]): number[] {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return [];
  const low = Math.min(...finite);
  const high = Math.max(...finite);
  return low === high ? [low] : [low, high];
}

/**
 * Where `state` lies on the axes, as its tool says it spans them
 * (`descriptor.axisSpan`), or null for a drawing kept to a place on the
 * screen, a tool that spans neither axis, or no usable point.
 */
export function drawingAxisSpan(state: DrawingState, descriptor: DrawingDescriptor): AxisExtent | null {
  const span = descriptor.axisSpan ?? 'both';
  if (span === 'none' || descriptor.anchoring === 'screen') return null;
  const prices = span === 'time' ? [] : ends(state.anchors.map((a) => a.price));
  const times = span === 'price' ? [] : ends(state.anchors.map((a) => a.time));
  return prices.length === 0 && times.length === 0 ? null : { prices, times };
}
