import type { DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';
import { barsBetween, drawLabelBox, formatPriceChange, spanBetween } from './labels.js';
import { screenAngleDeg } from './TrendAngle.js';

/** The text the info line shows: price change, bars (and time) spanned, angle. */
export function infoLineLines(state: DrawingState, viewport: ViewportState, angleDeg: number): string[] {
  const span = spanBetween(state, 0, 1, viewport);
  const bars = barsBetween(state, 0, 1, viewport);
  return [
    formatPriceChange(state.anchors[0].price, state.anchors[1].price),
    span ? `${bars} bars, ${span}` : `${bars} bars`,
    `${angleDeg.toFixed(1)}°`,
  ];
}

/** Trend line with a stats box: price change and %, bars and time spanned, angle. */
export class InfoLineTool extends DrawingBase {
  descriptor = { type: 'infoLine' as const, name: 'Info Line', requiredAnchors: 2 };

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    const a = this.anchorToPixel(state.anchors[0], viewport);
    const b = this.anchorToPixel(state.anchors[1], viewport);

    this.applyLineStyle(ctx, state.style);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    this.resetLineStyle(ctx);

    const lines = infoLineLines(state, viewport, screenAngleDeg(a, b));
    // Park the box past the end point, on the side the line is heading.
    const rising = b.y <= a.y;
    drawLabelBox(ctx, lines, b.x + (b.x >= a.x ? 8 : -8), b.y + (rising ? -6 : 6), b.x >= a.x ? 'left' : 'right', rising);

    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    const a = this.anchorToPixel(state.anchors[0], viewport);
    const b = this.anchorToPixel(state.anchors[1], viewport);
    return this.distanceToLine(point, a, b) <= tolerance;
  }
}
