import type { DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';
import { resolveBarIndex } from '../../viewport/ScaleMapping.js';
import { barsBetween, drawLabelBox, formatPriceChange, spanBetween } from './labels.js';

const UP_FILL = 'rgba(76, 141, 255, 0.12)';
const DOWN_FILL = 'rgba(232, 80, 91, 0.12)';

/** Summed volume of the bars between the two anchors, or null without data. */
export function volumeBetween(state: DrawingState, viewport: ViewportState): number | null {
  const data = viewport.data;
  if (!data || data.length === 0) return null;
  const i0 = Math.round(resolveBarIndex(state.anchors[0].time, viewport));
  const i1 = Math.round(resolveBarIndex(state.anchors[1].time, viewport));
  const from = Math.max(0, Math.min(i0, i1));
  const to = Math.min(data.length - 1, Math.max(i0, i1));
  let sum = 0;
  for (let i = from; i <= to; i++) sum += (data[i] as { volume?: number }).volume ?? 0;
  return sum;
}

function formatVolume(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(2)}K`;
  return v.toFixed(0);
}

/** The stats the box shows: price change, bars and time spanned, volume traded. */
export function dateAndPriceRangeLines(state: DrawingState, viewport: ViewportState): string[] {
  const span = spanBetween(state, 0, 1, viewport);
  const bars = barsBetween(state, 0, 1, viewport);
  const lines = [
    formatPriceChange(state.anchors[0].price, state.anchors[1].price),
    span ? `${bars} bars, ${span}` : `${bars} bars`,
  ];
  const vol = volumeBetween(state, viewport);
  if (vol !== null) lines.push(`Vol ${formatVolume(vol)}`);
  return lines;
}

/** Date and Price Range: a box measuring both axes at once, with volume traded inside it. */
export class DateAndPriceRangeTool extends DrawingBase {
  descriptor = { type: 'dateAndPriceRange' as const, name: 'Date and Price Range', requiredAnchors: 2 };

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    const p0 = this.anchorToPixel(state.anchors[0], viewport);
    const p1 = this.anchorToPixel(state.anchors[1], viewport);
    const x = Math.min(p0.x, p1.x);
    const y = Math.min(p0.y, p1.y);
    const w = Math.abs(p1.x - p0.x);
    const h = Math.abs(p1.y - p0.y);
    const up = state.anchors[1].price >= state.anchors[0].price;

    ctx.fillStyle = up ? UP_FILL : DOWN_FILL;
    ctx.fillRect(x, y, w, h);

    // Arrows along both measured axes, from the start toward the end anchor.
    this.applyLineStyle(ctx, state.style);
    const midX = x + w / 2;
    const midY = y + h / 2;
    ctx.beginPath();
    ctx.moveTo(midX, p0.y);
    ctx.lineTo(midX, p1.y);
    ctx.moveTo(p0.x, midY);
    ctx.lineTo(p1.x, midY);
    ctx.stroke();
    this.resetLineStyle(ctx);

    const lines = dateAndPriceRangeLines(state, viewport);
    // Below the box for a drop, above it for a rise — out of the way of the move.
    drawLabelBox(ctx, lines, midX, up ? y - 6 : y + h + 6, 'center', up);

    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    const p0 = this.anchorToPixel(state.anchors[0], viewport);
    const p1 = this.anchorToPixel(state.anchors[1], viewport);
    return point.x >= Math.min(p0.x, p1.x) - tolerance && point.x <= Math.max(p0.x, p1.x) + tolerance
      && point.y >= Math.min(p0.y, p1.y) - tolerance && point.y <= Math.max(p0.y, p1.y) + tolerance;
  }
}
