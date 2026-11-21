import type { CurveChartOptions, CurvePoint, Theme } from '@tradecanvas/commons';
import {
  AXIS_GAP,
  BOTTOM_LABELS,
  CHART_PAD,
  LABEL_GAP,
  LABEL_SIZE,
  TOP_MARK_ROOM,
  axisFormat,
  canvasMeasure,
  drawLegend,
  drawTooltip,
  drawTopMarks,
  drawValueAxis,
  extent,
  fontOf,
  layoutLegend,
  niceScale,
  numberFormat,
  readoutFormat,
  strokeHairline,
  scaleToPx,
  seriesColor,
  type LegendLayout,
  type Measure,
  type NiceScale,
  type Rect,
  type TooltipLine,
} from './chartKit.js';

/** A point's dot, px. */
const DOT_RADIUS = 2.5;
/** Points closer together than this have no dots: the line says it. */
const MIN_DOT_SPACING = 6;

const usable = (point: CurvePoint) => Number.isFinite(point.x) && Number.isFinite(point.y);
const byX = (points: readonly CurvePoint[]) => points.filter(usable).sort((a, b) => a.x - b.x);

/**
 * The slope at point `i` of a curve through `points` that never passes a
 * value it does not reach: flat where the line turns, so a smile has no dip
 * under its lowest quote. The points may be any distance apart; `xOf` and
 * `yOf` say where a point is, in values or in pixels.
 */
function slopeAt<P>(points: readonly P[], i: number, xOf: (point: P) => number, yOf: (point: P) => number): number {
  const n = points.length;
  if (n < 2) return 0;
  const run = (k: number) => xOf(points[k + 1]) - xOf(points[k]);
  const rise = (k: number) => (run(k) > 0 ? (yOf(points[k + 1]) - yOf(points[k])) / run(k) : 0);
  if (i === 0) return rise(0);
  if (i === n - 1) return rise(n - 2);
  const before = rise(i - 1);
  const after = rise(i);
  if (before * after <= 0) return 0;
  const h0 = run(i - 1);
  const h1 = run(i);
  return (3 * (h0 + h1)) / ((2 * h1 + h0) / before + (h1 + 2 * h0) / after);
}

const valueX = (point: CurvePoint) => point.x;
const valueY = (point: CurvePoint) => point.y;

/** A curve's value at `x`, through points by rising x: see curveValueAt. */
function valueAt(sorted: readonly CurvePoint[], x: number, smooth: boolean): number | null {
  if (!Number.isFinite(x) || sorted.length === 0 || x < sorted[0].x || x > sorted[sorted.length - 1].x) return null;
  // The first point at or past x, by halves: a curve may have a great many.
  let low = 0;
  let high = sorted.length - 1;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (sorted[middle].x >= x) high = middle;
    else low = middle + 1;
  }
  const b = sorted[low];
  if (b.x === x || low === 0) return b.y;
  const a = sorted[low - 1];
  const run = b.x - a.x;
  const t = (x - a.x) / run;
  if (!smooth) return a.y + (b.y - a.y) * t;
  // The cubic the chart draws between the two points, by their slopes.
  const t2 = t * t;
  const t3 = t2 * t;
  const from = slopeAt(sorted, low - 1, valueX, valueY) * run;
  const to = slopeAt(sorted, low, valueX, valueY) * run;
  return (2 * t3 - 3 * t2 + 1) * a.y + (t3 - 2 * t2 + t) * from + (3 * t2 - 2 * t3) * b.y + (t3 - t2) * to;
}

/**
 * A curve's value at `x`: its point there, or between the points either
 * side, straight, or with `smooth` along the rounded line the chart draws.
 * Null outside its points: a curve is not carried past its ends.
 */
export function curveValueAt(points: readonly CurvePoint[], x: number, smooth = false): number | null {
  return valueAt(byX(points), x, smooth);
}

export interface CurveLinePoint extends CurvePoint {
  px: number;
  py: number;
}

export interface CurveLine {
  name: string;
  color: string;
  dashed: boolean;
  /** By rising x. */
  points: CurveLinePoint[];
}

export interface CurveLayout {
  plot: Rect;
  xScale: NiceScale;
  yScale: NiceScale;
  lines: CurveLine[];
  /** Every x a curve has a point at, in order, each once. */
  xs: number[];
  legend: LegendLayout | null;
}

/** The x axis: the ticks given, over the data's own range, or a scale of round steps. */
function xScaleOf(options: CurveChartOptions, xs: readonly number[], width: number): NiceScale {
  const ticks = (options.ticks ?? []).map((tick) => tick.x).filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  const all = [...xs, ...(options.markers ?? []).map((marker) => marker.x).filter((x) => Number.isFinite(x))];
  const reach = extent(all);
  if (!reach) return niceScale(0, 1);
  if (ticks.length === 0) return niceScale(reach.min, reach.max, Math.max(2, Math.floor(width / 110)));
  const min = Math.min(reach.min, ticks[0]);
  const max = Math.max(reach.max, ticks[ticks.length - 1]);
  // One x alone: room either side of it.
  return min === max ? { min: min - 1, max: max + 1, step: 1, ticks } : { min, max, step: (max - min) / ticks.length, ticks };
}

/** How an x is written along the axis: its tick's label, the format given, or the scale's own. */
function xFormatOf(options: CurveChartOptions, scale: NiceScale): (value: number) => string {
  const labels = new Map((options.ticks ?? []).map((tick) => [tick.x, tick.label]));
  const format = options.xFormat ?? axisFormat(scale, options.locale);
  return (value) => labels.get(value) ?? format(value);
}

/** How an x is written at the pointer and at a marker: its tick's label, the format given, or in full. */
function xReadoutOf(options: CurveChartOptions, scale: NiceScale): (value: number) => string {
  const labels = new Map((options.ticks ?? []).map((tick) => [tick.x, tick.label]));
  // Ticks of your own leave the scale no round steps to count decimals by.
  const format = options.xFormat ?? (labels.size > 0 ? numberFormat(options.locale) : readoutFormat(scale, options.locale));
  return (value) => labels.get(value) ?? format(value);
}

/** Room between two labels along x, px. */
const TICK_SPACING = 8;

/** The x axis: a grid line at each tick, and its label under it unless it would run into the one before. */
function drawXAxis(ctx: CanvasRenderingContext2D, plot: Rect, scale: NiceScale, theme: Theme, format: (value: number) => string): void {
  ctx.save();
  ctx.font = fontOf(theme, LABEL_SIZE);
  ctx.fillStyle = theme.axisLabel;
  ctx.strokeStyle = theme.grid;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  let taken = -Infinity;
  for (const tick of scale.ticks) {
    const x = scaleToPx(scale, tick, plot.x, plot.width);
    strokeHairline(ctx, x, plot.y, x, plot.y + plot.height);
    const text = format(tick);
    const half = ctx.measureText(text).width / 2;
    if (x - half < taken + TICK_SPACING) continue;
    taken = x + half;
    ctx.fillText(text, Math.round(x), plot.y + plot.height + LABEL_GAP);
  }
  ctx.restore();
}

/** The curves over their axes, for a chart `width` × `height`. */
export function computeCurveLayout(options: CurveChartOptions, width: number, height: number, _theme: Theme, measure: Measure): CurveLayout {
  const series = options.series.map((s, i) => ({ name: s.name, color: seriesColor(i, s.color), dashed: s.dashed === true, points: byX(s.points) }));
  const xs = [...new Set(series.flatMap((s) => s.points.map((point) => point.x)))].sort((a, b) => a - b);
  const reach = extent(series.flatMap((s) => s.points.map((point) => point.y)));
  const xScale = xScaleOf(options, xs, width);
  const yScale = reach ? niceScale(reach.min, reach.max, Math.max(2, Math.floor(height / 60))) : niceScale(0, 1);
  const yFormat = options.valueFormat ?? axisFormat(yScale, options.locale);
  const xFormat = xFormatOf(options, xScale);
  const showLegend = options.legend ?? series.length > 1;
  const legend = showLegend && series.length > 0 ? layoutLegend(series.map((s) => ({ label: s.name, color: s.color })), width - CHART_PAD * 2, measure) : null;
  const marked = (options.markers ?? []).some((marker) => Number.isFinite(marker.x));
  const tickWidth = Math.max(0, ...yScale.ticks.map((tick) => measure(yFormat(tick), LABEL_SIZE)));
  const left = CHART_PAD + tickWidth + AXIS_GAP;
  const right = CHART_PAD + measure(xFormat(xScale.ticks[xScale.ticks.length - 1] ?? xScale.max), LABEL_SIZE) / 2;
  const top = CHART_PAD + (legend ? legend.height + LABEL_GAP : 0) + (marked ? TOP_MARK_ROOM : 0);
  const plot = { x: left, y: top, width: Math.max(1, width - left - right), height: Math.max(1, height - top - CHART_PAD - BOTTOM_LABELS) };
  const lines = series.map((s) => ({
    ...s,
    points: s.points.map((point) => ({
      ...point,
      px: scaleToPx(xScale, point.x, plot.x, plot.width),
      py: scaleToPx(yScale, point.y, plot.y, plot.height, true),
    })),
  }));
  return { plot, xScale, yScale, lines, xs, legend };
}

/** The x a curve has a point at that is nearest the pointer, inside the plot; null outside it or with no points. */
export function nearestCurveX(layout: CurveLayout, x: number, y: number): number | null {
  const { plot, xScale, xs } = layout;
  if (xs.length === 0 || x < plot.x || x > plot.x + plot.width || y < plot.y || y > plot.y + plot.height) return null;
  const value = xScale.min + ((x - plot.x) / plot.width) * (xScale.max - xScale.min);
  return xs.reduce((best, candidate) => (Math.abs(candidate - value) < Math.abs(best - value) ? candidate : best));
}

const pixelX = (point: CurveLinePoint) => point.px;
const pixelY = (point: CurveLinePoint) => point.py;

function strokeLine(ctx: CanvasRenderingContext2D, line: CurveLine, smooth: boolean): void {
  const { points } = line;
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0].px, points[0].py);
  let leaving = smooth ? slopeAt(points, 0, pixelX, pixelY) : 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const third = (b.px - a.px) / 3;
    const arriving = smooth ? slopeAt(points, i, pixelX, pixelY) : 0;
    if (smooth && third > 0) ctx.bezierCurveTo(a.px + third, a.py + leaving * third, b.px - third, b.py - arriving * third, b.px, b.py);
    else ctx.lineTo(b.px, b.py);
    leaving = arriving;
  }
  ctx.strokeStyle = line.color;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.setLineDash(line.dashed ? [5, 4] : []);
  ctx.stroke();
  ctx.setLineDash([]);
}

function dots(ctx: CanvasRenderingContext2D, line: CurveLine, theme: Theme, at: number | null, plot: Rect): void {
  const sparse = line.points.length <= 1 || plot.width / line.points.length >= MIN_DOT_SPACING;
  for (const point of line.points) {
    const hovered = at !== null && point.x === at;
    if (!sparse && !hovered) continue;
    ctx.beginPath();
    ctx.arc(point.px, point.py, hovered ? DOT_RADIUS + 1.5 : DOT_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = line.color;
    ctx.fill();
    ctx.strokeStyle = theme.background;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

export function renderCurve(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: CurveChartOptions,
  theme: Theme,
  pointer: { x: number; y: number } | null,
  layout: CurveLayout = computeCurveLayout(options, width, height, theme, canvasMeasure(ctx, theme)),
): CurveLayout {
  const { plot, xScale, yScale, lines } = layout;
  const valueFormat = options.valueFormat ?? numberFormat(options.locale);
  const xFormat = xFormatOf(options, xScale);
  const xReadout = xReadoutOf(options, xScale);

  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, width, height);
  drawValueAxis(ctx, plot, yScale, 'vertical', theme, options.valueFormat ?? axisFormat(yScale, options.locale));
  drawXAxis(ctx, plot, xScale, theme, xFormat);
  if (layout.legend) drawLegend(ctx, layout.legend, CHART_PAD, CHART_PAD, theme);

  const markers = (options.markers ?? []).filter((marker) => Number.isFinite(marker.x) && marker.x >= xScale.min && marker.x <= xScale.max);
  drawTopMarks(ctx, plot, markers.map((marker) => ({
    x: scaleToPx(xScale, marker.x, plot.x, plot.width),
    color: marker.color ?? theme.textSecondary,
    text: marker.label ?? xReadout(marker.x),
  })), theme);

  const at = pointer && options.crosshair !== false ? nearestCurveX(layout, pointer.x, pointer.y) : null;
  if (at !== null) {
    const x = Math.round(scaleToPx(xScale, at, plot.x, plot.width)) + 0.5;
    ctx.save();
    ctx.strokeStyle = theme.crosshair;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, plot.y);
    ctx.lineTo(x, plot.y + plot.height);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  for (const line of lines) strokeLine(ctx, line, options.smooth !== false);
  if (options.showPoints !== false) for (const line of lines) dots(ctx, line, theme, at, plot);
  ctx.restore();

  if (at !== null && pointer) {
    const rows: TooltipLine[] = [{ text: xReadout(at), bold: true }];
    for (const line of lines) {
      const value = valueAt(line.points, at, options.smooth !== false);
      if (value !== null) rows.push({ text: `${line.name}: ${valueFormat(value)}`, color: line.color });
    }
    drawTooltip(ctx, rows, pointer, { x: 0, y: 0, width, height }, theme);
  }
  return layout;
}
