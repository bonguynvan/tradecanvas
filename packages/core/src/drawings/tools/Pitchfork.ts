import type { DrawingDescriptor, DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';

export class PitchforkTool extends DrawingBase {
  descriptor: DrawingDescriptor = { type: 'pitchfork', name: "Andrews' Pitchfork", requiredAnchors: 3 };

  /**
   * Where the median line starts, given pivot A and the first reaction B.
   * Andrews' starts at A; the Schiff variants shift it toward B.
   */
  protected origin(p0: Point, _p1: Point): Point {
    return p0;
  }

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 3) {
      if (state.anchors.length === 2) {
        const a = this.anchorToPixel(state.anchors[0], viewport);
        const b = this.anchorToPixel(state.anchors[1], viewport);
        this.applyLineStyle(ctx, state.style);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        this.resetLineStyle(ctx);
      }
      return;
    }

    const a = this.anchorToPixel(state.anchors[0], viewport);
    const p1 = this.anchorToPixel(state.anchors[1], viewport);
    const p2 = this.anchorToPixel(state.anchors[2], viewport);
    const p0 = this.origin(a, p1);
    const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

    if (p0.x !== a.x || p0.y !== a.y) {
      // Schiff variants: show how the shifted origin relates to pivot A.
      ctx.strokeStyle = state.style.color;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(p0.x, p0.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Median line (from the origin through midpoint of p1-p2)
    const dx = mid.x - p0.x, dy = mid.y - p0.y;
    const len = Math.hypot(dx, dy) || 1;
    const ext = Math.hypot(viewport.chartRect.width, viewport.chartRect.height);
    const endX = p0.x + (dx / len) * ext;
    const endY = p0.y + (dy / len) * ext;

    this.applyLineStyle(ctx, state.style);

    // Median line
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Upper prong (from p1 parallel to median)
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p1.x + (dx / len) * ext, p1.y + (dy / len) * ext);
    ctx.stroke();

    // Lower prong (from p2 parallel to median)
    ctx.beginPath();
    ctx.moveTo(p2.x, p2.y);
    ctx.lineTo(p2.x + (dx / len) * ext, p2.y + (dy / len) * ext);
    ctx.stroke();

    this.resetLineStyle(ctx);
    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 3) return false;
    const p1 = this.anchorToPixel(state.anchors[1], viewport);
    const p2 = this.anchorToPixel(state.anchors[2], viewport);
    const p0 = this.origin(this.anchorToPixel(state.anchors[0], viewport), p1);
    const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    if (this.distanceToInfiniteLine(point, p0, mid) <= tolerance) return true;
    const dx = mid.x - p0.x, dy = mid.y - p0.y;
    const p1end = { x: p1.x + dx, y: p1.y + dy };
    const p2end = { x: p2.x + dx, y: p2.y + dy };
    if (this.distanceToInfiniteLine(point, p1, p1end) <= tolerance) return true;
    if (this.distanceToInfiniteLine(point, p2, p2end) <= tolerance) return true;
    return false;
  }
}

/** Schiff Pitchfork: the median starts halfway in price from A to B, at A's time. */
export class SchiffPitchforkTool extends PitchforkTool {
  override descriptor: DrawingDescriptor = { type: 'schiffPitchfork', name: 'Schiff Pitchfork', requiredAnchors: 3 };

  protected override origin(p0: Point, p1: Point): Point {
    return { x: p0.x, y: (p0.y + p1.y) / 2 };
  }
}

/** Modified Schiff Pitchfork: the median starts at the midpoint of A and B, in both time and price. */
export class ModifiedSchiffPitchforkTool extends PitchforkTool {
  override descriptor: DrawingDescriptor = { type: 'modifiedSchiffPitchfork', name: 'Modified Schiff Pitchfork', requiredAnchors: 3 };

  protected override origin(p0: Point, p1: Point): Point {
    return { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
  }
}
