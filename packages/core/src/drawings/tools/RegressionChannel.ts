import type { DataSeries, DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';
import { barIndexToX, priceToY, resolveBarIndex } from '../../viewport/ScaleMapping.js';
import { dashFor, drawingFill } from '../drawingLook.js';

/** How many standard deviations of the closes from the line its bands sit at. */
const BAND_DEVIATIONS = 2;
/** How strongly the middle line shows: a guide between the bands. */
const MIDDLE_ALPHA = 0.8;
/** Fits kept at once, by the bars they cover: one per channel on the chart, and more while one is dragged. */
const MAX_CACHED_FITS = 64;

/** The least-squares line through closes, by bar index, and their spread around it. */
export interface RegressionFit {
  /** The first and last bar the fit covers. */
  from: number;
  to: number;
  slope: number;
  intercept: number;
  /** The closes' standard deviation from the line. */
  deviation: number;
  /** The line's price at bar `index`. */
  at(index: number): number;
}

/** The least-squares line through `closes` at bars `from`..`to`, or null with fewer than two. */
export function fitCloses(data: DataSeries, from: number, to: number): RegressionFit | null {
  const lo = Math.max(0, Math.round(Math.min(from, to)));
  const hi = Math.min(data.length - 1, Math.round(Math.max(from, to)));
  const n = hi - lo + 1;
  if (n < 2) return null;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = lo; i <= hi; i++) {
    const y = data[i].close;
    sx += i; sy += y; sxx += i * i; sxy += i * y;
  }
  const denom = n * sxx - sx * sx;
  if (denom === 0) return null;
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  const at = (index: number) => intercept + slope * index;
  let sq = 0;
  for (let i = lo; i <= hi; i++) sq += (data[i].close - at(i)) ** 2;
  return { from: lo, to: hi, slope, intercept, deviation: Math.sqrt(sq / n), at };
}

/**
 * A regression channel: the least-squares line through the closes between
 * its two points, with bands two standard deviations either side. Its points
 * set the bars it covers; their prices are not used, and its handles sit on
 * the line at its two ends.
 */
export class RegressionChannelTool extends DrawingBase {
  descriptor = { type: 'regressionChannel' as const, name: 'Regression Channel', requiredAnchors: 2, fill: true };

  private dataGetter: (() => DataSeries) | null = null;
  private dataRevision: () => number = () => 0;
  /**
   * Fits worked out, by the bars they cover: a fit runs over every bar between its points, and
   * a frame, a hover and a hit test each ask for it. Worked out again when the bars change.
   */
  private fits = new Map<string, RegressionFit | null>();
  private fitsFor: { data: DataSeries | null; length: number; revision: number } = { data: null, length: 0, revision: -1 };

  setDataGetter(getter: () => DataSeries, revision: () => number = () => 0): void {
    this.dataGetter = getter;
    this.dataRevision = revision;
    this.fits.clear();
  }

  /** The fit over the bars between its points, or null without bars. */
  fit(state: DrawingState, viewport: ViewportState): RegressionFit | null {
    const data = this.dataGetter?.();
    if (!data || data.length < 2 || state.anchors.length < 2) return null;
    const revision = this.dataRevision();
    const seen = this.fitsFor;
    if (seen.data !== data || seen.length !== data.length || seen.revision !== revision) {
      this.fits.clear();
      this.fitsFor = { data, length: data.length, revision };
    }
    const from = Math.round(resolveBarIndex(state.anchors[0].time, viewport));
    const to = Math.round(resolveBarIndex(state.anchors[1].time, viewport));
    const key = `${from}:${to}`;
    let fit = this.fits.get(key);
    if (fit === undefined) {
      if (this.fits.size >= MAX_CACHED_FITS) this.fits.clear();
      fit = fitCloses(data, from, to);
      this.fits.set(key, fit);
    }
    return fit;
  }

  /** The middle line and the two bands as segments on screen, or the line between its points without bars. */
  private lines(state: DrawingState, viewport: ViewportState): { middle: [Point, Point]; upper: [Point, Point] | null; lower: [Point, Point] | null } {
    const fit = this.fit(state, viewport);
    if (!fit) {
      const a = this.anchorToPixel(state.anchors[0], viewport);
      const b = this.anchorToPixel(state.anchors[1], viewport);
      return { middle: [a, b], upper: null, lower: null };
    }
    const seg = (shift: number): [Point, Point] => [
      { x: barIndexToX(fit.from, viewport), y: priceToY(fit.at(fit.from) + shift, viewport) },
      { x: barIndexToX(fit.to, viewport), y: priceToY(fit.at(fit.to) + shift, viewport) },
    ];
    const band = fit.deviation * BAND_DEVIATIONS;
    return { middle: seg(0), upper: seg(band), lower: seg(-band) };
  }

  /** Its handles on the fitted line at its two ends. */
  protected override handlePoints(state: DrawingState, viewport: ViewportState): Point[] {
    const fit = this.fit(state, viewport);
    if (!fit) return super.handlePoints(state, viewport);
    // At the line's ends: a point past the bars has its handle where the line stops.
    return state.anchors.map((anchor) => {
      const index = Math.max(fit.from, Math.min(fit.to, Math.round(resolveBarIndex(anchor.time, viewport))));
      return { x: barIndexToX(index, viewport), y: priceToY(fit.at(index), viewport) };
    });
  }

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    const { middle, upper, lower } = this.lines(state, viewport);

    // The band between the two lines first, so it doesn't dim them.
    if (upper && lower && state.style.fillColor) {
      ctx.fillStyle = drawingFill(state.style);
      ctx.beginPath();
      ctx.moveTo(upper[0].x, upper[0].y);
      ctx.lineTo(upper[1].x, upper[1].y);
      ctx.lineTo(lower[1].x, lower[1].y);
      ctx.lineTo(lower[0].x, lower[0].y);
      ctx.closePath();
      ctx.fill();
    }

    this.applyLineStyle(ctx, state.style);
    for (const line of [upper, lower]) {
      if (!line) continue;
      ctx.beginPath();
      ctx.moveTo(line[0].x, line[0].y);
      ctx.lineTo(line[1].x, line[1].y);
      ctx.stroke();
    }
    // The fitted line dashed between them; solid when there are no bands to set it apart from.
    if (upper) {
      ctx.setLineDash(dashFor('dashed', state.style.lineWidth));
      ctx.lineCap = 'butt';
      ctx.globalAlpha = MIDDLE_ALPHA;
    }
    ctx.beginPath();
    ctx.moveTo(middle[0].x, middle[0].y);
    ctx.lineTo(middle[1].x, middle[1].y);
    ctx.stroke();
    ctx.globalAlpha = 1;

    this.resetLineStyle(ctx);
    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    const { middle, upper, lower } = this.lines(state, viewport);
    return [middle, upper, lower].some((line) => line !== null && this.distanceToLine(point, line[0], line[1]) <= tolerance);
  }
}
