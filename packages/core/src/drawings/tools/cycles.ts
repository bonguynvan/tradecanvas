import type { DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase, nearPolyline } from '../DrawingBase.js';

/** Most cycles drawn, however small they are on screen. */
const MAX_CYCLES = 200;
const ARC_STEPS = 32;
/** Pixels between the points a sine line is drawn through. */
const SINE_STEP_PX = 3;

/**
 * Time cycles: half circles of one cycle's length, repeated along the time
 * axis from the first: click where a cycle starts, then where it ends.
 */
export class TimeCyclesTool extends DrawingBase {
  descriptor = { type: 'timeCycles' as const, name: 'Time Cycles', requiredAnchors: 2, fill: true };

  /** Each cycle as points: a half circle above the first point's price. */
  private cycles(state: DrawingState, viewport: ViewportState): Point[][] {
    const a = this.anchorToPixel(state.anchors[0], viewport);
    const b = this.anchorToPixel(state.anchors[1], viewport);
    const length = b.x - a.x;
    if (Math.abs(length) < 2) return [];
    const r = Math.abs(length) / 2;
    const step = Math.sign(length);
    const right = viewport.chartRect.x + viewport.chartRect.width;
    const left = viewport.chartRect.x;
    const out: Point[][] = [];
    for (let i = 0; i < MAX_CYCLES; i++) {
      const start = a.x + length * i;
      if ((step > 0 && start > right) || (step < 0 && start < left)) break;
      const cx = start + length / 2;
      const pts: Point[] = [];
      for (let j = 0; j <= ARC_STEPS; j++) {
        const angle = Math.PI + (Math.PI * j) / ARC_STEPS; // the upper half, left to right
        pts.push({ x: cx + r * Math.cos(angle), y: a.y + r * Math.sin(angle) });
      }
      out.push(pts);
    }
    return out;
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
    return this.cycles(state, viewport).some((pts) => nearPolyline(point, pts, tolerance));
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
