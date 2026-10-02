import type { DrawingState, OHLCBar, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase, distanceToSegment } from '../DrawingBase.js';
import { barIndexToX, priceToY, resolveBarIndex, timestampToBarIndex } from '../../viewport/ScaleMapping.js';
import { drawArrowHead } from './freehand.js';
import { barsBetween, drawLabelBox, formatDrawingPrice, formatPriceChange, spanBetween } from './labels.js';
import { inRect, type Rect } from './textBox.js';

const UP_COLOR = '#26a69a';
const DOWN_COLOR = '#ef5350';
/** Most bars a bars pattern copies. */
const MAX_PATTERN_BARS = 500;

/** Whether the target was reached after the forecast was made, missed (its time passed), or neither yet. */
export type ForecastOutcome = 'reached' | 'missed' | 'pending';

/** How a forecast from `from` to `to` turned out on `bars`. */
export function forecastOutcome(bars: readonly OHLCBar[], from: { time: number; price: number }, to: { time: number; price: number }): ForecastOutcome {
  const up = to.price >= from.price;
  // Only the bars after the forecast's start: found by search, not a scan.
  const first = bars.length > 0 ? Math.max(0, Math.floor(timestampToBarIndex(from.time, bars)) + 1) : 0;
  for (let i = first; i < bars.length; i++) {
    const bar = bars[i];
    if (bar.time <= from.time) continue;
    if (up ? bar.high >= to.price : bar.low <= to.price) return 'reached';
  }
  const last = bars[bars.length - 1];
  return last && last.time > to.time ? 'missed' : 'pending';
}

/**
 * A forecast: from a bar's price to a target, with the change, how long it
 * should take, and whether the price got there (green) or the time ran out
 * first (red).
 */
export class ForecastTool extends DrawingBase {
  descriptor = { type: 'forecast' as const, name: 'Forecast', requiredAnchors: 2 };

  private bars: () => readonly OHLCBar[] = () => [];

  setDataGetter(getter: () => readonly OHLCBar[]): void {
    this.bars = getter;
  }

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    const [from, to] = state.anchors;
    const a = this.anchorToPixel(from, viewport);
    const b = this.anchorToPixel(to, viewport);
    const outcome = forecastOutcome(this.bars(), from, to);
    const color = outcome === 'reached' ? UP_COLOR : outcome === 'missed' ? DOWN_COLOR : state.style.color;
    this.applyLineStyle(ctx, { ...state.style, color });
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    drawArrowHead(ctx, a, b);
    this.resetLineStyle(ctx);
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
    ctx.stroke();

    const span = spanBetween(state, 0, 1, viewport);
    const lines = [
      formatPriceChange(from.price, to.price),
      `${formatDrawingPrice(to.price, from.price)} · ${barsBetween(state, 0, 1, viewport)} bars${span ? `, ${span}` : ''}`,
      outcome === 'reached' ? 'Target reached' : outcome === 'missed' ? 'Target missed' : 'Pending',
    ];
    drawLabelBox(ctx, lines, b.x, b.y + (b.y < a.y ? -10 : 10), 'center', b.y < a.y);
    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    const a = this.anchorToPixel(state.anchors[0], viewport);
    const b = this.anchorToPixel(state.anchors[1], viewport);
    return distanceToSegment(point, a, b) <= tolerance;
  }
}

/**
 * A projection: a move (A to B) carried over from a third point (C), with
 * the target's price and change: click A, B, then where the projection starts.
 */
export class ProjectionTool extends DrawingBase {
  descriptor = { type: 'projection' as const, name: 'Projection', requiredAnchors: 3, fill: true };

  /** The projected end: C moved by A→B, in bars and in price. */
  private target(state: DrawingState, viewport: ViewportState): Point {
    const [a, b, c] = state.anchors;
    const bars = resolveBarIndex(b.time, viewport) - resolveBarIndex(a.time, viewport);
    return { x: barIndexToX(resolveBarIndex(c.time, viewport) + bars, viewport), y: priceToY(c.price + (b.price - a.price), viewport) };
  }

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    const pts = state.anchors.map((p) => this.anchorToPixel(p, viewport));
    this.applyLineStyle(ctx, state.style);
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(pts[1].x, pts[1].y);
    ctx.stroke();
    if (state.anchors.length >= 3) {
      const c = pts[2];
      const d = this.target(state, viewport);
      ctx.fillStyle = state.style.fillColor ?? 'rgba(76, 141, 255, 0.1)';
      ctx.fillRect(Math.min(c.x, d.x), Math.min(c.y, d.y), Math.abs(d.x - c.x), Math.abs(d.y - c.y));
      this.applyLineStyle(ctx, state.style);
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(d.x, d.y);
      ctx.stroke();
      drawArrowHead(ctx, c, d);
      const [a, b, cAnchor] = state.anchors;
      const end = cAnchor.price + (b.price - a.price);
      drawLabelBox(ctx, [formatDrawingPrice(end, cAnchor.price), formatPriceChange(cAnchor.price, end)], d.x, d.y + (d.y < c.y ? -8 : 8), 'center', d.y < c.y);
    }
    this.resetLineStyle(ctx);
    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    const pts = state.anchors.map((p) => this.anchorToPixel(p, viewport));
    if (distanceToSegment(point, pts[0], pts[1]) <= tolerance) return true;
    return pts.length >= 3 && distanceToSegment(point, pts[2], this.target(state, viewport)) <= tolerance;
  }
}

/**
 * A copy of some bars placed elsewhere, to compare a past move with now:
 * click the first and last bar to copy, then where the copy starts.
 */
export class BarsPatternTool extends DrawingBase {
  descriptor = {
    type: 'barsPattern' as const,
    name: 'Bars Pattern',
    requiredAnchors: 3,
    options: {
      mode: {
        kind: 'choice' as const,
        label: 'Show as',
        default: 'bars',
        choices: [
          { value: 'bars', label: 'Bars' },
          { value: 'line', label: 'Line' },
          { value: 'highLow', label: 'High-low' },
        ],
      },
      mirrored: { kind: 'boolean' as const, label: 'Mirrored', default: false },
      flipped: { kind: 'boolean' as const, label: 'Flipped', default: false },
    },
  };

  private bars: () => readonly OHLCBar[] = () => [];

  setDataGetter(getter: () => readonly OHLCBar[]): void {
    this.bars = getter;
  }

  /** The copied bars, moved so the first one opens at the third point. */
  private copied(state: DrawingState): OHLCBar[] {
    const data = this.bars();
    if (data.length === 0) return [];
    const [a, b, c] = state.anchors;
    const i0 = Math.max(0, Math.round(timestampToBarIndex(Math.min(a.time, b.time), data)));
    const i1 = Math.min(data.length - 1, Math.round(timestampToBarIndex(Math.max(a.time, b.time), data)));
    const source = data.slice(i0, Math.min(i1 + 1, i0 + MAX_PATTERN_BARS));
    if (source.length === 0) return [];
    const flipped = this.option<boolean>(state, 'flipped');
    const mirrored = this.option<boolean>(state, 'mirrored');
    const ordered = mirrored ? [...source].reverse() : source;
    const base = ordered[0].open;
    // Upside down, the copy turns about its first open.
    const move = (price: number) => c.price + (flipped ? base - price : price - base);
    return ordered.map((bar) => {
      const high = move(bar.high);
      const low = move(bar.low);
      return { ...bar, open: move(bar.open), close: move(bar.close), high: Math.max(high, low), low: Math.min(high, low) };
    });
  }

  private box(state: DrawingState, viewport: ViewportState, bars: readonly OHLCBar[]): Rect | null {
    if (bars.length === 0) return null;
    const start = resolveBarIndex(state.anchors[2].time, viewport);
    const x0 = barIndexToX(start, viewport) - viewport.barWidth / 2;
    const x1 = barIndexToX(start + bars.length - 1, viewport) + viewport.barWidth / 2;
    const top = priceToY(Math.max(...bars.map((bar) => bar.high)), viewport);
    const bottom = priceToY(Math.min(...bars.map((bar) => bar.low)), viewport);
    return { x: x0, y: Math.min(top, bottom), width: x1 - x0, height: Math.abs(bottom - top) };
  }

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    const a = this.anchorToPixel(state.anchors[0], viewport);
    const b = this.anchorToPixel(state.anchors[1], viewport);
    // The bars being copied, marked under them.
    this.applyLineStyle(ctx, state.style);
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    this.resetLineStyle(ctx);
    if (state.anchors.length >= 3) this.renderCopy(ctx, state, viewport);
    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  private renderCopy(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState): void {
    const bars = this.copied(state);
    if (bars.length === 0) return;
    const start = resolveBarIndex(state.anchors[2].time, viewport);
    const mode = this.option<string>(state, 'mode');
    ctx.strokeStyle = state.style.color;
    ctx.fillStyle = state.style.color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.7;
    if (mode === 'line') {
      ctx.beginPath();
      bars.forEach((bar, i) => {
        const x = barIndexToX(start + i, viewport);
        const y = priceToY(bar.close, viewport);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    } else {
      const half = Math.max(1, viewport.barWidth / 2);
      bars.forEach((bar, i) => {
        const x = barIndexToX(start + i, viewport);
        ctx.beginPath();
        ctx.moveTo(x, priceToY(bar.high, viewport));
        ctx.lineTo(x, priceToY(bar.low, viewport));
        ctx.stroke();
        if (mode === 'highLow') return;
        // A rising bar is hollow, a falling one filled.
        const top = priceToY(Math.max(bar.open, bar.close), viewport);
        const height = Math.max(1, priceToY(Math.min(bar.open, bar.close), viewport) - top);
        if (bar.close >= bar.open) ctx.strokeRect(x - half, top, half * 2, height);
        else ctx.fillRect(x - half, top, half * 2, height);
      });
    }
    ctx.globalAlpha = 1;
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    const a = this.anchorToPixel(state.anchors[0], viewport);
    const b = this.anchorToPixel(state.anchors[1], viewport);
    if (distanceToSegment(point, a, b) <= tolerance) return true;
    const box = state.anchors.length >= 3 ? this.box(state, viewport, this.copied(state)) : null;
    return box !== null && inRect(point, box, tolerance);
  }
}
