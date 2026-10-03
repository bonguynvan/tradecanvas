import type { ViewportState } from '@tradecanvas/commons';

/** Whether a line at `y` lies on the main plot (not above it, nor over the time axis or a pane below). */
export function inPlot(y: number, viewport: ViewportState): boolean {
  const { chartRect } = viewport;
  return y >= chartRect.y && y <= chartRect.y + chartRect.height;
}
