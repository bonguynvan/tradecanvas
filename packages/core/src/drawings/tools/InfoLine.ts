import type { DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';
import { barsBetween, drawLabelBox, formatPriceChange, spanBetween } from './labels.js';
import { screenAngleDeg } from './TrendAngle.js';
import { drawLineText, TextHitCache } from './lineText.js';

/** The text the info line shows: price change, bars (and time) spanned, angle. */
export function infoLineLines(state: DrawingState, viewport: ViewportState, angleDeg: number): string[] {
  const span = spanBetween(state, 0, 1, viewport);
  const bars = barsBetween(state, 0, 1, viewport);
  return [
    formatPriceChange(state.anchors[0].price, state.anchors[1].price, viewport),
    span ? `${bars} bars, ${span}` : `${bars} bars`,
    `${angleDeg.toFixed(1)}°`,
  ];
}

/** Trend line with a stats box: price change and %, bars and time spanned, angle. */
export class InfoLineTool extends DrawingBase {
  descriptor = { type: 'infoLine' as const, name: 'Info Line', requiredAnchors: 2, text: true };

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    // Words not drawn this time (no text, the line off the plot or its points together) are not there to click.
    this.texts.set(state.id, null);
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

    this.texts.set(state.id, drawLineText(ctx, state.style, this.anchorToPixel(state.anchors[0], viewport), this.anchorToPixel(state.anchors[1], viewport), viewport.chartRect));
    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  /** Its text's box as last drawn: a click on the words picks it. */
  private texts = new TextHitCache();

  /** Where its words were drawn: the toolbar over a selection keeps clear of them. */
  textBox(state: DrawingState): { x: number; y: number; width: number; height: number } | null {
    return this.texts.bounds(state.id);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    return this.texts.hit(state.id, point, tolerance) || this.hitShape(point, state, viewport, tolerance);
  }

  private hitShape(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    const a = this.anchorToPixel(state.anchors[0], viewport);
    const b = this.anchorToPixel(state.anchors[1], viewport);
    return this.distanceToLine(point, a, b) <= tolerance;
  }
}
