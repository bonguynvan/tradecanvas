import type { DrawingState, Point, ViewportState } from '@chart-lib/commons';
import { DrawingBase } from '../DrawingBase.js';

export class MeasureTool extends DrawingBase {
  descriptor = { type: 'measure' as const, name: 'Measure', requiredAnchors: 2 };

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    const p1 = this.anchorToPixel(state.anchors[0], viewport);
    const p2 = this.anchorToPixel(state.anchors[1], viewport);

    // Dotted line from p1 to p2
    this.applyLineStyle(ctx, state.style);
    ctx.setLineDash([4, 4]); // Always dashed for measure
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    this.resetLineStyle(ctx);

    // Info label
    const priceDiff = state.anchors[1].price - state.anchors[0].price;
    const barsDiff = Math.abs(state.anchors[1].time - state.anchors[0].time);
    const pctChange = state.anchors[0].price !== 0 ? (priceDiff / state.anchors[0].price * 100) : 0;
    const pixelDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);

    const lines = [
      `Price: ${priceDiff >= 0 ? '+' : ''}${priceDiff.toFixed(2)} (${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(2)}%)`,
      `Bars: ${barsDiff}`,
    ];

    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;

    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    // Background
    const maxWidth = Math.max(...lines.map((l) => ctx.measureText(l).width));
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(midX - maxWidth / 2 - 6, midY - lines.length * 14 - 4, maxWidth + 12, lines.length * 14 + 8);

    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], midX, midY - (lines.length - 1 - i) * 14);
    }

    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    const p1 = this.anchorToPixel(state.anchors[0], viewport);
    const p2 = this.anchorToPixel(state.anchors[1], viewport);
    return this.distanceToLine(point, p1, p2) <= tolerance;
  }
}
