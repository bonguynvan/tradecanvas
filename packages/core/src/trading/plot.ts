import type { ViewportState } from '@tradecanvas/commons';

/** Whether a line at `y` lies on the main plot (not above it, nor over the time axis or a pane below). */
export function inPlot(y: number, viewport: ViewportState): boolean {
  const { chartRect } = viewport;
  return y >= chartRect.y && y <= chartRect.y + chartRect.height;
}

/** `y` kept on the main plot. */
export function clampToPlot(y: number, viewport: ViewportState): number {
  const { chartRect } = viewport;
  return Math.min(Math.max(y, chartRect.y), chartRect.y + chartRect.height);
}

/** A price's line across the plot at `y`, on the pixel grid, `dash` empty for solid. */
export function levelLine(ctx: CanvasRenderingContext2D, viewport: ViewportState, y: number, color: string, dash: readonly number[]): void {
  const { chartRect } = viewport;
  ctx.setLineDash(dash as number[]);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(chartRect.x, Math.round(y) + 0.5);
  ctx.lineTo(chartRect.x + chartRect.width, Math.round(y) + 0.5);
  ctx.stroke();
  ctx.setLineDash([]);
}
