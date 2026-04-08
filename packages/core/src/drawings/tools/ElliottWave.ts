import type { DrawingState, Point, ViewportState } from '@chart-lib/commons';
import { DrawingBase } from '../DrawingBase.js';

const WAVE_LABELS = ['1', '2', '3', '4', '5', 'A', 'B', 'C'];

export class ElliottWaveTool extends DrawingBase {
  descriptor = { type: 'elliottWave' as const, name: 'Elliott Wave', requiredAnchors: 8 };

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    const pts = state.anchors.map((a) => this.anchorToPixel(a, viewport));

    this.applyLineStyle(ctx, state.style);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();
    this.resetLineStyle(ctx);

    // Labels
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = state.style.color;
    ctx.textAlign = 'center';
    for (let i = 0; i < pts.length && i < WAVE_LABELS.length; i++) {
      const offsetY = i % 2 === 0 ? -12 : 12;
      ctx.textBaseline = offsetY < 0 ? 'bottom' : 'top';
      ctx.fillText(WAVE_LABELS[i], pts[i].x, pts[i].y + offsetY);
    }

    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    const pts = state.anchors.map((a) => this.anchorToPixel(a, viewport));
    for (let i = 0; i < pts.length - 1; i++) {
      if (this.distanceToLine(point, pts[i], pts[i + 1]) <= tolerance) return true;
    }
    return false;
  }
}
