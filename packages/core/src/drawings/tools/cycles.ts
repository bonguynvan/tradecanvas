import type { DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase, nearPolyline } from '../DrawingBase.js';

/** Most cycles drawn, however small they are on screen. */
const MAX_CYCLES = 400;
const ARC_STEPS = 32;
/** Pixels between the points a sine line is drawn through. */
const SINE_STEP_PX = 3;

/**
 * Time cycles: half circles of one cycle's length, repeated along the time
 * axis from the first: click where a cycle starts, then where it ends.
 */
export class TimeCyclesTool extends DrawingBase {
  descriptor = { type: 'timeCycles' as const, name: 'Time Cycles', requiredAnchors: 2, fill: true };

  /**
   * The cycles on screen, each as its centre: half circles of radius `r`
   * above the first point's price, repeating from it (the way it was drawn).
   */
  private visibleCycles(state: DrawingState, viewport: ViewportState): { y: number; r: number; centres: number[] } {
    const a = this.anchorToPixel(state.anchors[0], viewport);
    const b = this.anchorToPixel(state.anchors[1], viewport);
    const length = b.x - a.x;
    const r = Math.abs(length) / 2;
    if (r < 1) return { y: a.y, r, centres: [] };
    const left = viewport.chartRect.x;
    const right = left + viewport.chartRect.width;
    // Cycle i spans a.x + length·i to a.x + length·(i + 1): start at the first one in view.
    const far = length > 0 ? left : right;
    const first = Math.max(0, Math.floor((far - a.x) / length) - 1);
    const centres: number[] = [];
    for (let i = first; centres.length < MAX_CYCLES; i++) {
      const cx = a.x + length * (i + 0.5);
      if (cx - r > right || cx + r < left) {
        if (centres.length > 0 || (length > 0 ? cx - r > right : cx + r < left)) break;
        continue;
      }
      centres.push(cx);
    }
    return { y: a.y, r, centres };
  }

  private cycles(state: DrawingState, viewport: ViewportState): Point[][] {
    const { y, r, centres } = this.visibleCycles(state, viewport);
    return centres.map((cx) => {
      const pts: Point[] = [];
      for (let j = 0; j <= ARC_STEPS; j++) {
        const angle = Math.PI + (Math.PI * j) / ARC_STEPS; // the upper half, left to right
        pts.push({ x: cx + r * Math.cos(angle), y: y + r * Math.sin(angle) });
      }
      return pts;
    });
  }

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    const cycles = this.cycles(state, viewport);
    ctx.fillStyle = state.style.fillColor ?? 'rgba(76, 141, 255, 0.1)';
    this.applyLineStyle(ctx, state.style);
    for (const pts of cycles) {
      ctx.beginPath();
      pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.fill();
      ctx.stroke();
    }
    this.resetLineStyle(ctx);
    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    // On a cycle's arc: as far from its centre as the radius, above the base.
    const { y, r, centres } = this.visibleCycles(state, viewport);
    if (point.y > y + tolerance) return false;
    return centres.some((cx) => Math.abs(Math.hypot(point.x - cx, point.y - y) - r) <= tolerance);
  }
}

/**
 * A sine wave across the chart: click a peak (or a trough), then the trough
 * (or peak) after it; that is half a period and the swing.
 */
export class SineLineTool extends DrawingBase {
  descriptor = { type: 'sineLine' as const, name: 'Sine Line', requiredAnchors: 2 };

  private points(state: DrawingState, viewport: ViewportState): Point[] {
    const a = this.anchorToPixel(state.anchors[0], viewport);
    const b = this.anchorToPixel(state.anchors[1], viewport);
    const half = b.x - a.x;
    if (Math.abs(half) < 1) return [a, b];
    const mid = (a.y + b.y) / 2;
    const swing = (a.y - b.y) / 2;
    const { x: left, width } = viewport.chartRect;
    const pts: Point[] = [];
    for (let x = left; x <= left + width; x += SINE_STEP_PX) {
      pts.push({ x, y: mid + swing * Math.cos((Math.PI * (x - a.x)) / half) });
    }
    return pts;
  }

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    this.applyLineStyle(ctx, state.style);
    ctx.beginPath();
    this.points(state, viewport).forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    this.resetLineStyle(ctx);
    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    return nearPolyline(point, this.points(state, viewport), tolerance);
  }
}
