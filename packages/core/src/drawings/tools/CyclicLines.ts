import type { DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';

/** Hard cap so a tiny period on a wide chart can't flood the canvas. */
const MAX_LINES = 400;
/** Below this pixel period the lines would merge into a solid fill. */
const MIN_PERIOD_PX = 2;

/** x positions of the cycle lines from A forward, spaced by A→B, within the chart. */
export function cycleLineXs(a: Point, b: Point, viewport: ViewportState): number[] {
  const period = Math.abs(b.x - a.x);
  if (period < MIN_PERIOD_PX) return [a.x];
  const right = viewport.chartRect.x + viewport.chartRect.width;
  const xs: number[] = [];
  const start = Math.min(a.x, b.x);
  for (let x = start; x <= right && xs.length < MAX_LINES; x += period) xs.push(x);
  return xs;
}

/** Cyclic Lines: vertical lines repeating at the A→B interval, for spotting time cycles. */
export class CyclicLinesTool extends DrawingBase {
  descriptor = { type: 'cyclicLines' as const, name: 'Cyclic Lines', requiredAnchors: 2 };

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    const a = this.anchorToPixel(state.anchors[0], viewport);
    const b = this.anchorToPixel(state.anchors[1], viewport);
    const { chartRect } = viewport;

    this.applyLineStyle(ctx, state.style);
    ctx.beginPath();
    for (const x of cycleLineXs(a, b, viewport)) {
      if (x < chartRect.x) continue;
      ctx.moveTo(x, chartRect.y);
      ctx.lineTo(x, chartRect.y + chartRect.height);
    }
    ctx.stroke();
    this.resetLineStyle(ctx);

    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    const a = this.anchorToPixel(state.anchors[0], viewport);
    const b = this.anchorToPixel(state.anchors[1], viewport);
    return cycleLineXs(a, b, viewport).some((x) => Math.abs(point.x - x) <= tolerance);
  }
}
