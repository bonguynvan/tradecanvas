import type { DrawingState, Point, ViewportState, DataSeries } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';
import { barIndexToX, priceToY, resolveBarIndex } from '../../viewport/ScaleMapping.js';
import { fillTextWithHalo, formatDrawingPrice } from './labels.js';
import { dashFor, hasOwnFill, keepOnPlot, readableText, roleFont } from '../drawingLook.js';

/** The point of control's colour, unless the drawing has a fill of its own. */
const POC_COLOR = '#f2a93b';
/** Price rows the volume is shared into. */
const BINS = 40;
/** The widest row, as a share of the range's width: the histogram leaves the bars beside it in view. */
const HISTOGRAM_SHARE = 1 / 3;
/** The share of the volume the value area holds, around the point of control. */
const VALUE_AREA = 0.7;
/** How strongly rows in and out of the value area are shaded. */
const VALUE_ALPHA = 0.45;
const OUTSIDE_ALPHA = 0.2;
/** How strongly the range's outline shows. */
const OUTLINE_ALPHA = 0.5;
/** A row's gap below the next, px. */
const ROW_GAP = 0.5;

/** A range's rows: the bars it covers, the volume at each price row, the point of control and the value area. */
interface Rows {
  /** The first and last bar it covers. */
  start: number;
  end: number;
  pMin: number;
  pMax: number;
  binSize: number;
  bins: Float64Array;
  maxBin: number;
  poc: number;
  valueLow: number;
  valueHigh: number;
}

/** A range's profile: its box on screen, the rows' volumes and the point of control. */
interface Profile {
  /** The first and last bar's centres, px: where its handles sit. */
  startX: number;
  endX: number;
  left: number;
  right: number;
  /** The box's top (the highest high) and bottom (the lowest low), px. */
  top: number;
  bottom: number;
  pMin: number;
  binSize: number;
  bins: Float64Array;
  maxBin: number;
  poc: number;
  /** The rows in the value area, from its lowest to its highest. */
  valueLow: number;
  valueHigh: number;
}

/**
 * Volume Profile (Range): the volume traded at each price between two bars,
 * as a histogram inside the range's box, from its left edge, with the value
 * area shaded and the point of control drawn across. Its handles sit on the
 * box's corners.
 */
export class VolumeProfileRangeTool extends DrawingBase {
  descriptor = { type: 'volumeProfileRange' as const, name: 'Volume Profile (Range)', requiredAnchors: 2, fill: true, priceOnly: true };

  private dataGetter: (() => DataSeries) | null = null;
  private dataRevision: () => number = () => 0;
  /**
   * The rows last worked out, and for which bars: a frame, a hover and a hit
   * test each ask for them, and working them out reads every bar in the range.
   */
  private cached: { data: DataSeries; length: number; revision: number; start: number; end: number; rows: Rows | null } | null = null;

  setDataGetter(getter: () => DataSeries, revision: () => number = () => 0): void {
    this.dataGetter = getter;
    this.dataRevision = revision;
    this.cached = null;
  }

  /** The profile of the bars between the two points, or null without bars there. */
  private profile(state: DrawingState, viewport: ViewportState): Profile | null {
    if (state.anchors.length < 2 || !this.dataGetter) return null;
    const data = this.dataGetter();
    const idx0 = Math.round(resolveBarIndex(state.anchors[0].time, viewport));
    const idx1 = Math.round(resolveBarIndex(state.anchors[1].time, viewport));
    const start = Math.max(0, Math.min(idx0, idx1));
    const end = Math.min(data.length - 1, Math.max(idx0, idx1));
    if (start >= data.length || end < 0 || start > end) return null;
    const revision = this.dataRevision();
    const c = this.cached;
    const rows = c && c.data === data && c.length === data.length && c.revision === revision && c.start === start && c.end === end
      ? c.rows
      : this.rowsOf(data, start, end);
    this.cached = { data, length: data.length, revision, start, end, rows };
    if (!rows) return null;
    return {
      startX: barIndexToX(start, viewport),
      endX: barIndexToX(end, viewport),
      left: barIndexToX(start, viewport) - viewport.barWidth / 2,
      right: barIndexToX(end, viewport) + viewport.barWidth / 2,
      top: priceToY(rows.pMax, viewport),
      bottom: priceToY(rows.pMin, viewport),
      pMin: rows.pMin, binSize: rows.binSize, bins: rows.bins, maxBin: rows.maxBin, poc: rows.poc,
      valueLow: rows.valueLow, valueHigh: rows.valueHigh,
    };
  }

  /** The volume at each price row of bars `start`..`end`, or null when they have no range or no volume. */
  private rowsOf(data: DataSeries, start: number, end: number): Rows | null {

    let pMin = Infinity, pMax = -Infinity;
    for (let i = start; i <= end; i++) {
      if (data[i].low < pMin) pMin = data[i].low;
      if (data[i].high > pMax) pMax = data[i].high;
    }
    if (!(pMin < pMax)) return null;

    // Each bar's volume shared over the rows its range spans.
    const binSize = (pMax - pMin) / BINS;
    const bins = new Float64Array(BINS);
    for (let i = start; i <= end; i++) {
      const bar = data[i];
      const lowBin = Math.max(0, Math.floor((bar.low - pMin) / binSize));
      const highBin = Math.min(BINS - 1, Math.floor((bar.high - pMin) / binSize));
      const share = (bar.volume ?? 1) / (highBin - lowBin + 1);
      for (let b = lowBin; b <= highBin; b++) bins[b] += share;
    }
    let poc = 0;
    let total = 0;
    for (let b = 0; b < BINS; b++) {
      total += bins[b];
      if (bins[b] > bins[poc]) poc = b;
    }
    if (bins[poc] === 0) return null;

    // The value area: out from the point of control, the bigger neighbour first, to 70% of the volume.
    let valueLow = poc, valueHigh = poc, held = bins[poc];
    while (held < total * VALUE_AREA && (valueLow > 0 || valueHigh < BINS - 1)) {
      const below = valueLow > 0 ? bins[valueLow - 1] : -1;
      const above = valueHigh < BINS - 1 ? bins[valueHigh + 1] : -1;
      if (above >= below) held += bins[++valueHigh];
      else held += bins[--valueLow];
    }

    return { start, end, pMin, pMax, binSize, bins, maxBin: bins[poc], poc, valueLow, valueHigh };
  }

  /**
   * Its handles at the box's top and foot, over its first and last bars' centres: the first
   * point's at the top, the second's at the foot. On a bar's centre, a drag lands on that bar.
   */
  protected override handlePoints(state: DrawingState, viewport: ViewportState): Point[] {
    const p = this.profile(state, viewport);
    if (!p) return super.handlePoints(state, viewport);
    const firstLeft = state.anchors[0].time <= state.anchors[1].time;
    return [
      { x: firstLeft ? p.startX : p.endX, y: p.top },
      { x: firstLeft ? p.endX : p.startX, y: p.bottom },
    ];
  }

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    const p = this.profile(state, viewport);
    if (!p) return;
    const color = state.style.color;
    // Its own fill colour when one was set by hand; the old blue default would leave it unseen.
    const pocColor = hasOwnFill(state.style) ? state.style.fillColor! : POC_COLOR;
    const widest = Math.max(1, (p.right - p.left) * HISTOGRAM_SHARE);

    ctx.save();
    // The rows from the box's left edge, the value area stronger, the point of control in its colour.
    for (let b = 0; b < BINS; b++) {
      const yTop = priceToY(p.pMin + (b + 1) * p.binSize, viewport);
      const yBot = priceToY(p.pMin + b * p.binSize, viewport);
      ctx.globalAlpha = b >= p.valueLow && b <= p.valueHigh ? VALUE_ALPHA : OUTSIDE_ALPHA;
      ctx.fillStyle = b === p.poc ? pocColor : color;
      ctx.fillRect(p.left, Math.min(yTop, yBot), (p.bins[b] / p.maxBin) * widest, Math.max(1, Math.abs(yBot - yTop) - ROW_GAP));
    }
    ctx.restore();

    // The range's box, a 1 px outline.
    ctx.save();
    this.applyGuideStyle(ctx, color);
    ctx.globalAlpha = OUTLINE_ALPHA;
    this.strokeCrispRect(ctx, p.left, p.top, p.right - p.left, p.bottom - p.top);
    ctx.restore();

    // The point of control across the range, dashed, and its price past it.
    const pocPrice = p.pMin + (p.poc + 0.5) * p.binSize;
    const pocY = priceToY(pocPrice, viewport);
    ctx.save();
    ctx.strokeStyle = pocColor;
    ctx.lineWidth = 1;
    ctx.setLineDash(dashFor('dashed', 1));
    this.strokeHorizontal(ctx, p.left, p.right, pocY);
    ctx.setLineDash([]);
    ctx.fillStyle = readableText(pocColor);
    ctx.font = roleFont('mark');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    const text = `POC ${formatDrawingPrice(pocPrice, pocPrice, viewport)}`;
    const at = keepOnPlot(p.right + 4, pocY - 2, ctx.measureText(text).width, 0);
    fillTextWithHalo(ctx, text, at.left, pocY - 2);
    ctx.restore();

    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    const p = this.profile(state, viewport);
    if (!p) return false;
    return point.x >= p.left - tolerance && point.x <= p.right + tolerance
      && point.y >= p.top - tolerance && point.y <= p.bottom + tolerance;
  }
}
