import type { StackedAreaOptions, Theme } from '@tradecanvas/commons';
import { withAlpha } from '@tradecanvas/commons';
import {
  AXIS_GAP,
  BOTTOM_LABELS,
  CHART_PAD,
  LABEL_GAP,
  LABEL_SIZE,
  axisFormat,
  canvasMeasure,
  drawLegend,
  drawTooltip,
  drawValueAxis,
  extent,
  fontOf,
  layoutLegend,
  niceScale,
  numberFormat,
  percentFormat,
  scaleToPx,
  seriesColor,
  type LegendLayout,
  type Measure,
  type NiceScale,
  type Rect,
  type TooltipLine,
} from './chartKit.js';

/** How strongly a series' colour fills its area: the grid shows through, the line over it is the colour itself. */
const AREA_ALPHA = 0.55;
const DOT_RADIUS = 3;
/** Shares of a whole: the value axis when the areas fill the height. */
const SHARE_SCALE: NiceScale = { min: 0, max: 1, step: 0.25, ticks: [0, 0.25, 0.5, 0.75, 1] };
/** Room between two labels along x, px. */
const LABEL_SPACING = 12;

export interface StackedBand {
  name: string;
  color: string;
  /** What the series counts at each point: its values, a value under zero or missing as none. */
  raw: number[];
  /** What is drawn: `raw`, or its shares of each point's total when normalized. */
  values: number[];
  /** The area's lower and upper edge at each point, px. */
  lower: number[];
  upper: number[];
}

export interface StackedAreaLayout {
  plot: Rect;
  yScale: NiceScale;
  /** Each point's x, px: the first and the last at the plot's edges. */
  xs: number[];
  /** The first series at the bottom. */
  bands: StackedBand[];
  /** What the series count together at each point. */
  totals: number[];
  normalized: boolean;
  /** Every which label is written along x: 1 when they all fit, 2 for every second… */
  labelEvery: number;
  legend: LegendLayout | null;
}

const counted = (value: number | undefined) => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0);

/** The series' areas one on another over the points, for a chart `width` × `height`. */
export function computeStackedAreaLayout(options: StackedAreaOptions, width: number, height: number, _theme: Theme, measure: Measure): StackedAreaLayout {
  const { categories, series } = options;
  const count = categories.length;
  const normalized = options.normalized === true;
  const raws = series.map((s) => categories.map((_, i) => counted(s.values[i])));
  const totals = categories.map((_, i) => raws.reduce((sum, raw) => sum + raw[i], 0));
  // To the largest total, whatever its size: only nothing at all needs a scale of its own.
  const most = extent(totals)?.max ?? 0;
  const yScale = normalized ? SHARE_SCALE : niceScale(0, most > 0 ? most : 1, Math.max(2, Math.floor(height / 60)));
  const format = normalized ? percentFormat(options.locale) : (options.valueFormat ?? axisFormat(yScale, options.locale));
  const legend = (options.legend ?? series.length > 1) && series.length > 0
    ? layoutLegend(series.map((s, i) => ({ label: s.name, color: seriesColor(i, s.color) })), width - CHART_PAD * 2, measure)
    : null;
  const tickWidth = Math.max(0, ...yScale.ticks.map((tick) => measure(format(tick), LABEL_SIZE)));
  const left = CHART_PAD + tickWidth + AXIS_GAP;
  const right = CHART_PAD + (count > 0 ? Math.min(measure(categories[count - 1], LABEL_SIZE) / 2, width * 0.1) : 0);
  const top = CHART_PAD + (legend ? legend.height + LABEL_GAP : 0);
  const plot = { x: left, y: top, width: Math.max(1, width - left - right), height: Math.max(1, height - top - CHART_PAD - BOTTOM_LABELS) };
  const xs = categories.map((_, i) => (count === 1 ? plot.x + plot.width / 2 : plot.x + (plot.width * i) / (count - 1)));

  const toY = (value: number) => scaleToPx(yScale, value, plot.y, plot.height, true);
  let sums = categories.map(() => 0);
  let lower = sums.map(toY);
  const bands = series.map((s, k): StackedBand => {
    const values = raws[k].map((value, i) => (normalized ? (totals[i] > 0 ? value / totals[i] : 0) : value));
    sums = sums.map((sum, i) => sum + values[i]);
    const upper = sums.map(toY);
    const band = { name: s.name, color: seriesColor(k, s.color), raw: raws[k], values, lower, upper };
    lower = upper;
    return band;
  });
  // Every label when they fit side by side, else every second, every third…
  const widest = (extent(categories.map((label) => measure(label, LABEL_SIZE)))?.max ?? 0) + LABEL_SPACING;
  const spacing = count > 1 ? plot.width / (count - 1) : plot.width;
  const labelEvery = Math.max(1, Math.ceil(widest / Math.max(Number.EPSILON, spacing)));
  return { plot, yScale, xs, bands, totals, normalized, labelEvery, legend };
}

/** The point nearest the pointer's x, inside the plot; its index. */
export function hitStackedCategory(layout: StackedAreaLayout, x: number, y: number): number | null {
  const { plot, xs } = layout;
  if (xs.length === 0 || x < plot.x || x > plot.x + plot.width || y < plot.y || y > plot.y + plot.height) return null;
  // The points are evenly spaced from edge to edge.
  return xs.length === 1 ? 0 : Math.min(xs.length - 1, Math.max(0, Math.round(((x - plot.x) / plot.width) * (xs.length - 1))));
}

/** A band's outline: along its upper edge, back along its lower one. One point alone spans the plot. */
function tracePath(ctx: CanvasRenderingContext2D, layout: StackedAreaLayout, band: StackedBand, edge: 'area' | 'top'): void {
  const { plot } = layout;
  const xs = layout.xs.length === 1 ? [plot.x, plot.x + plot.width] : layout.xs;
  const at = (values: readonly number[], i: number) => values[layout.xs.length === 1 ? 0 : i];
  ctx.beginPath();
  xs.forEach((x, i) => (i === 0 ? ctx.moveTo(x, at(band.upper, i)) : ctx.lineTo(x, at(band.upper, i))));
  if (edge === 'top') return;
  for (let i = xs.length - 1; i >= 0; i--) ctx.lineTo(xs[i], at(band.lower, i));
  ctx.closePath();
}

function drawCategories(ctx: CanvasRenderingContext2D, layout: StackedAreaLayout, categories: readonly string[], theme: Theme): void {
  const { plot, xs } = layout;
  ctx.font = fontOf(theme, LABEL_SIZE);
  ctx.fillStyle = theme.axisLabel;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i < xs.length; i += layout.labelEvery) ctx.fillText(categories[i], Math.round(xs[i]), plot.y + plot.height + LABEL_GAP);
}

export function renderStackedArea(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: StackedAreaOptions,
  theme: Theme,
  pointer: { x: number; y: number } | null,
  layout: StackedAreaLayout = computeStackedAreaLayout(options, width, height, theme, canvasMeasure(ctx, theme)),
): StackedAreaLayout {
  const { plot, yScale, bands, normalized } = layout;
  const format = options.valueFormat ?? numberFormat(options.locale);
  const share = percentFormat(options.locale);

  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, width, height);
  drawValueAxis(ctx, plot, yScale, 'vertical', theme, normalized ? share : (options.valueFormat ?? axisFormat(yScale, options.locale)));
  if (layout.legend) drawLegend(ctx, layout.legend, CHART_PAD, CHART_PAD, theme);

  ctx.save();
  if (layout.xs.length > 0) {
    for (const band of bands) {
      tracePath(ctx, layout, band, 'area');
      ctx.fillStyle = withAlpha(band.color, AREA_ALPHA);
      ctx.fill();
      tracePath(ctx, layout, band, 'top');
      ctx.strokeStyle = band.color;
      ctx.lineWidth = 1.5;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  }
  drawCategories(ctx, layout, options.categories, theme);
  ctx.restore();

  const hovered = pointer && options.crosshair !== false ? hitStackedCategory(layout, pointer.x, pointer.y) : null;
  if (hovered !== null && pointer) {
    const x = Math.round(layout.xs[hovered]) + 0.5;
    ctx.save();
    ctx.strokeStyle = theme.crosshair;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, plot.y);
    ctx.lineTo(x, plot.y + plot.height);
    ctx.stroke();
    for (const band of bands) {
      ctx.beginPath();
      ctx.arc(layout.xs[hovered], band.upper[hovered], DOT_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = band.color;
      ctx.fill();
    }
    ctx.restore();
    // The series as they are stacked: the top one first.
    const rows: TooltipLine[] = [{ text: options.categories[hovered], bold: true }];
    for (const band of [...bands].reverse()) {
      const part = normalized ? ` · ${share(band.values[hovered])}` : '';
      rows.push({ text: `${band.name}: ${format(band.raw[hovered])}${part}`, color: band.color });
    }
    rows.push({ text: format(layout.totals[hovered]), bold: true });
    drawTooltip(ctx, rows, pointer, { x: 0, y: 0, width, height }, theme);
  }
  return layout;
}
