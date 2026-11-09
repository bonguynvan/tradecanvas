import type { DrawingState, OHLCBar, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase, distanceToSegment } from '../DrawingBase.js';
import { barIndexToX, priceToY, resolveBarIndex, timestampToBarIndex } from '../../viewport/ScaleMapping.js';
import { drawArrowHead } from './freehand.js';
import { barsBetween, drawLabelBox, formatDrawingPrice, formatPriceChange, spanBetween } from './labels.js';
import { inRect, type Rect } from './textBox.js';
import { drawingFill, drawingLook } from '../drawingLook.js';
import { withAlpha } from '@tradecanvas/commons';

/** The ring round a forecast's target, px. */
const TARGET_RING = 5;
/** How strongly a bars pattern's copy and the band over its source show. */
const COPY_ALPHA = 0.85;
const SOURCE_ALPHA = 0.08;
/** Most bars a bars pattern copies. */
const MAX_PATTERN_BARS = 500;

/** Whether the target was reached by its time, missed (its time passed first), or neither yet. */
export type ForecastOutcome = 'reached' | 'missed' | 'pending';

/** How a forecast from `from` to `to` turned out on `bars`. */
export function forecastOutcome(bars: readonly OHLCBar[], from: { time: number; price: number }, to: { time: number; price: number }): ForecastOutcome {
  const up = to.price >= from.price;
  // Only the bars between the forecast's start and its deadline: the first
  // found by search, the scan stopping at the deadline.
  const first = bars.length > 0 ? Math.max(0, Math.floor(timestampToBarIndex(from.time, bars)) + 1) : 0;
  for (let i = first; i < bars.length; i++) {
    const bar = bars[i];
    if (bar.time <= from.time) continue;
    if (bar.time > to.time) return 'missed';
    if (up ? bar.high >= to.price : bar.low <= to.price) return 'reached';
  }
  return 'pending';
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
    const look = drawingLook();
    const color = outcome === 'reached' ? look.rise : outcome === 'missed' ? look.fall : state.style.color;
    // The line to the target's ring, not into it: the ring is the target.
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const end = len > TARGET_RING ? { x: b.x - ((b.x - a.x) / len) * TARGET_RING, y: b.y - ((b.y - a.y) / len) * TARGET_RING } : b;
    this.applyLineStyle(ctx, { ...state.style, color });
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    this.resetLineStyle(ctx);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, state.style.lineWidth);
    ctx.beginPath();
    ctx.arc(b.x, b.y, TARGET_RING, 0, Math.PI * 2);
    ctx.stroke();

    const span = spanBetween(state, 0, 1, viewport);
    const lines = [
      formatPriceChange(from.price, to.price, viewport),
      `${formatDrawingPrice(to.price, from.price, viewport)} · ${barsBetween(state, 0, 1, viewport)} bars${span ? ` · ${span}` : ''}`,
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
      ctx.fillStyle = drawingFill(state.style);
      ctx.fillRect(Math.min(c.x, d.x), Math.min(c.y, d.y), Math.abs(d.x - c.x), Math.abs(d.y - c.y));
      this.applyLineStyle(ctx, state.style);
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(d.x, d.y);
      ctx.stroke();
      drawArrowHead(ctx, c, d);
      const [a, b, cAnchor] = state.anchors;
      const end = cAnchor.price + (b.price - a.price);
      drawLabelBox(ctx, [formatDrawingPrice(end, cAnchor.price, viewport), formatPriceChange(cAnchor.price, end, viewport)], d.x, d.y + (d.y < c.y ? -8 : 8), 'center', d.y < c.y);
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
    // Both points before the first bar (or after the last): nothing to copy.
    if (i1 < i0) return [];
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
    let high = -Infinity;
    let low = Infinity;
    for (const bar of bars) {
      if (bar.high > high) high = bar.high;
      if (bar.low < low) low = bar.low;
    }
    const top = priceToY(high, viewport);
    const bottom = priceToY(low, viewport);
    return { x: x0, y: Math.min(top, bottom), width: x1 - x0, height: Math.abs(bottom - top) };
  }

  /**
   * The bars being copied: from the first point's bar to the second's, over
   * their highs and lows; null before there are bars. Its corners are where
   * its first two handles sit.
   */
  private source(state: DrawingState, viewport: ViewportState): Rect | null {
    const data = this.bars();
    if (data.length === 0) return null;
    const [a, b] = state.anchors;
    const i0 = Math.max(0, Math.round(timestampToBarIndex(Math.min(a.time, b.time), data)));
    const i1 = Math.min(data.length - 1, Math.round(timestampToBarIndex(Math.max(a.time, b.time), data)));
    if (i1 < i0) return null;
    let high = -Infinity;
    let low = Infinity;
    for (let i = i0; i <= i1; i++) {
      if (data[i].high > high) high = data[i].high;
      if (data[i].low < low) low = data[i].low;
    }
    const x0 = barIndexToX(resolveBarIndex(data[i0].time, viewport), viewport) - viewport.barWidth / 2;
    const x1 = barIndexToX(resolveBarIndex(data[i1].time, viewport), viewport) + viewport.barWidth / 2;
    const top = priceToY(high, viewport);
    const bottom = priceToY(low, viewport);
    return { x: x0, y: Math.min(top, bottom), width: x1 - x0, height: Math.abs(bottom - top) };
  }

  /**
   * Its first two handles on the band's top, over the first and last bars it copies (on a
   * bar's centre a drag lands on that bar); the third where the copy starts.
   */
  protected override handlePoints(state: DrawingState, viewport: ViewportState): Point[] {
    const points = super.handlePoints(state, viewport);
    const band = this.source(state, viewport);
    if (!band || points.length < 2) return points;
    const [a, b] = state.anchors;
    const leftFirst = a.time <= b.time;
    const half = viewport.barWidth / 2;
    const first = band.x + half;
    const last = band.x + band.width - half;
    return [
      { x: leftFirst ? first : last, y: band.y },
      { x: leftFirst ? last : first, y: band.y },
      ...points.slice(2),
    ];
  }

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    // The bars being copied, under a light band in the drawing's colour.
    const band = this.source(state, viewport);
    if (band) {
      ctx.fillStyle = withAlpha(state.style.color, SOURCE_ALPHA);
      ctx.fillRect(band.x, band.y, band.width, band.height);
    }
    if (state.anchors.length >= 3) this.renderCopy(ctx, state, viewport);
    // While selected, the copy's outline, so it reads as one thing.
    const copy = selected && state.anchors.length >= 3 ? this.box(state, viewport, this.copied(state)) : null;
    if (copy) {
      ctx.save();
      this.applyGuideStyle(ctx, state.style.color, true);
      this.strokeCrispRect(ctx, copy.x, copy.y, copy.width, copy.height);
      ctx.restore();
    }
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
    ctx.globalAlpha = COPY_ALPHA;
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
        // On whole pixels: the wick one sharp column, the body's edges sharp.
        const x = Math.round(barIndexToX(start + i, viewport)) + 0.5;
        ctx.lineWidth = 1;
        this.strokeVertical(ctx, x, priceToY(bar.high, viewport), priceToY(bar.low, viewport));
        if (mode === 'highLow') return;
        // A rising bar is hollow, a falling one filled.
        const top = Math.round(priceToY(Math.max(bar.open, bar.close), viewport));
        const height = Math.max(1, Math.round(priceToY(Math.min(bar.open, bar.close), viewport)) - top);
        const left = Math.round(x - half);
        const width = Math.max(1, Math.round(half * 2));
        if (bar.close >= bar.open) {
          ctx.lineWidth = 1;
          this.strokeCrispRect(ctx, left, top, width, height);
        } else ctx.fillRect(left, top, width, height);
      });
    }
    ctx.globalAlpha = 1;
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    const band = this.source(state, viewport);
    if (band && inRect(point, band, tolerance)) return true;
    const box = state.anchors.length >= 3 ? this.box(state, viewport, this.copied(state)) : null;
    return box !== null && inRect(point, box, tolerance);
  }
}
