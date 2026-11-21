import type { BoxPlotGroup, BoxPlotLabels, BoxPlotOptions, BoxPlotStats, Theme } from '@tradecanvas/commons';
import { TC_SERIES_COLORS, withAlpha } from '@tradecanvas/commons';
import {
  AXIS_GAP,
  BOTTOM_LABELS,
  CHART_PAD,
  LABEL_GAP,
  LABEL_SIZE,
  axisFormat,
  canvasMeasure,
  drawTooltip,
  drawValueAxis,
  fitText,
  fontOf,
  niceScale,
  numberFormat,
  scaleToPx,
  strokeHairline,
  type Measure,
  type NiceScale,
  type Rect,
} from './chartKit.js';

/** How far a whisker reaches past the box, in box heights, when the options do not say: Tukey's. */
const DEFAULT_WHISKERS = 1.5;
/** A box is no wider than this, px, however few there are, and takes this share of its slot. */
const MAX_BOX_WIDTH = 48;
const BOX_SHARE = 0.6;
const OUTLIER_RADIUS = 2.5;
const BOX_FILL_ALPHA = 0.25;
const BOX_HOVER_ALPHA = 0.45;

const DEFAULT_LABELS: BoxPlotLabels = { max: 'Max', q3: 'Q3', median: 'Median', q1: 'Q1', min: 'Min' };

/** The value a share `p` of the way through `sorted`, straight between the two it falls among. */
function quantile(sorted: readonly number[], p: number): number {
  const at = (sorted.length - 1) * p;
  const below = Math.floor(at);
  const above = Math.min(sorted.length - 1, below + 1);
  return sorted[below] + (sorted[above] - sorted[below]) * (at - below);
}

/**
 * A box plot's numbers for `values`: the quartiles, and the whiskers' ends
 * at the furthest values within `whiskers` box heights of the box. What is
 * further out is an outlier. Null with no values that are numbers.
 */
export function boxPlotStats(values: readonly number[], whiskers = DEFAULT_WHISKERS): BoxPlotStats | null {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const reach = whiskers === Infinity ? Infinity : (Number.isFinite(whiskers) && whiskers >= 0 ? whiskers : DEFAULT_WHISKERS) * (q3 - q1);
  const within = sorted.filter((value) => value >= q1 - reach && value <= q3 + reach);
  return {
    // A whisker never ends inside the box: between two values a quartile is past the nearer one.
    min: Math.min(q1, within[0] ?? q1),
    q1,
    median: quantile(sorted, 0.5),
    q3,
    max: Math.max(q3, within[within.length - 1] ?? q3),
    outliers: sorted.filter((value) => value < q1 - reach || value > q3 + reach),
  };
}

/** A group's numbers: the ones given when they are all numbers, else worked out from its values. */
function statsOf(group: BoxPlotGroup, whiskers: number | undefined): BoxPlotStats | null {
  const given = group.stats;
  if (given && [given.min, given.q1, given.median, given.q3, given.max].every((value) => Number.isFinite(value))) {
    return { ...given, outliers: (given.outliers ?? []).filter((value) => Number.isFinite(value)) };
  }
  return boxPlotStats(group.values ?? [], whiskers);
}

export interface BoxRect {
  group: BoxPlotGroup;
  stats: BoxPlotStats;
  color: string;
  /** The box's middle, and how wide it is. */
  x: number;
  width: number;
  /** The slot the group has along x: the pointer in it reads this box. */
  from: number;
  to: number;
  yMin: number;
  yQ1: number;
  yMedian: number;
  yQ3: number;
  yMax: number;
  outliers: { value: number; y: number }[];
}

export interface BoxPlotLayout {
  plot: Rect;
  yScale: NiceScale;
  /** The groups that have numbers. */
  boxes: BoxRect[];
  /** Every group's label and the middle of its slot. */
  slots: { label: string; x: number; width: number }[];
}

/** A box for each group over one value axis, for a chart `width` × `height`. */
export function computeBoxPlotLayout(options: BoxPlotOptions, width: number, height: number, theme: Theme, measure: Measure): BoxPlotLayout {
  const groups = options.data.map((group) => ({ group, stats: statsOf(group, options.whiskers) }));
  const values = groups.flatMap(({ stats }) => (stats ? [stats.min, stats.max, ...stats.outliers] : []));
  const yScale = values.length > 0 ? niceScale(Math.min(...values), Math.max(...values), Math.max(2, Math.floor(height / 60))) : niceScale(0, 1);
  const format = options.valueFormat ?? axisFormat(yScale, options.locale);
  const tickWidth = Math.max(0, ...yScale.ticks.map((tick) => measure(format(tick), LABEL_SIZE)));
  const left = CHART_PAD + tickWidth + AXIS_GAP;
  const plot = { x: left, y: CHART_PAD, width: Math.max(1, width - left - CHART_PAD), height: Math.max(1, height - CHART_PAD * 2 - BOTTOM_LABELS) };
  const slot = plot.width / Math.max(1, groups.length);
  const toY = (value: number) => scaleToPx(yScale, value, plot.y, plot.height, true);
  const slots = groups.map(({ group }, i) => ({ label: group.label, x: plot.x + slot * (i + 0.5), width: slot }));
  const boxes = groups.flatMap(({ group, stats }, i): BoxRect[] => {
    if (!stats) return [];
    const sign = stats.median < 0 ? theme.candleDown : theme.candleUp;
    return [{
      group,
      stats,
      color: group.color ?? (options.colorBySign ? sign : TC_SERIES_COLORS[0]),
      x: slots[i].x,
      width: Math.max(2, Math.min(MAX_BOX_WIDTH, slot * BOX_SHARE)),
      from: plot.x + slot * i,
      to: plot.x + slot * (i + 1),
      yMin: toY(stats.min),
      yQ1: toY(stats.q1),
      yMedian: toY(stats.median),
      yQ3: toY(stats.q3),
      yMax: toY(stats.max),
      outliers: stats.outliers.map((value) => ({ value, y: toY(value) })),
    }];
  });
  return { plot, yScale, boxes, slots };
}

/** The box whose slot holds the pointer's x, inside the plot. */
export function hitBox(layout: BoxPlotLayout, x: number, y: number): BoxRect | null {
  const { plot } = layout;
  if (y < plot.y || y > plot.y + plot.height) return null;
  return layout.boxes.find((box) => x >= box.from && x < box.to) ?? null;
}

function drawBox(ctx: CanvasRenderingContext2D, box: BoxRect, hovered: boolean): void {
  const left = Math.round(box.x - box.width / 2) + 0.5;
  const right = Math.round(box.x + box.width / 2) + 0.5;
  const middle = Math.round(box.x) + 0.5;
  const cap = box.width / 4;
  ctx.strokeStyle = box.color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  // The whiskers, and a cap at each end.
  ctx.moveTo(middle, box.yMax);
  ctx.lineTo(middle, box.yQ3);
  ctx.moveTo(middle, box.yQ1);
  ctx.lineTo(middle, box.yMin);
  for (const y of [box.yMax, box.yMin]) {
    ctx.moveTo(middle - cap, Math.round(y) + 0.5);
    ctx.lineTo(middle + cap, Math.round(y) + 0.5);
  }
  ctx.stroke();
  // A box of no height (every value the same) still shows as a line.
  const top = Math.round(box.yQ3) + 0.5;
  const boxHeight = Math.max(1, Math.round(box.yQ1) - Math.round(box.yQ3));
  ctx.fillStyle = withAlpha(box.color, hovered ? BOX_HOVER_ALPHA : BOX_FILL_ALPHA);
  ctx.fillRect(left, top, right - left, boxHeight);
  ctx.strokeRect(left, top, right - left, boxHeight);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(left, Math.round(box.yMedian));
  ctx.lineTo(right, Math.round(box.yMedian));
  ctx.stroke();
  ctx.lineWidth = 1;
  for (const outlier of box.outliers) {
    ctx.beginPath();
    ctx.arc(box.x, outlier.y, OUTLIER_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
  }
}

export function renderBoxPlot(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: BoxPlotOptions,
  theme: Theme,
  pointer: { x: number; y: number } | null,
  layout: BoxPlotLayout = computeBoxPlotLayout(options, width, height, theme, canvasMeasure(ctx, theme)),
): BoxPlotLayout {
  const { plot, yScale } = layout;
  const measure = canvasMeasure(ctx, theme);
  const format = options.valueFormat ?? numberFormat(options.locale);

  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, width, height);
  drawValueAxis(ctx, plot, yScale, 'vertical', theme, options.valueFormat ?? axisFormat(yScale, options.locale));
  if (yScale.min < 0 && yScale.max > 0) {
    // Zero: which boxes are a gain and which a loss.
    const zero = scaleToPx(yScale, 0, plot.y, plot.height, true);
    ctx.save();
    ctx.strokeStyle = theme.textSecondary;
    strokeHairline(ctx, plot.x, zero, plot.x + plot.width, zero);
    ctx.restore();
  }

  const hovered = pointer && options.crosshair !== false ? hitBox(layout, pointer.x, pointer.y) : null;
  ctx.save();
  for (const box of layout.boxes) drawBox(ctx, box, box === hovered);
  ctx.restore();

  ctx.save();
  ctx.font = fontOf(theme, LABEL_SIZE);
  ctx.fillStyle = theme.axisLabel;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (const slot of layout.slots) {
    const text = fitText(slot.label, slot.width - 4, measure);
    if (text) ctx.fillText(text, Math.round(slot.x), plot.y + plot.height + LABEL_GAP);
  }
  ctx.restore();

  if (hovered && pointer) {
    const labels = { ...DEFAULT_LABELS, ...options.labels };
    const { stats } = hovered;
    drawTooltip(ctx, [
      { text: hovered.group.label, bold: true, color: hovered.color },
      { text: `${labels.max} ${format(stats.max)}` },
      { text: `${labels.q3} ${format(stats.q3)}` },
      { text: `${labels.median} ${format(stats.median)}` },
      { text: `${labels.q1} ${format(stats.q1)}` },
      { text: `${labels.min} ${format(stats.min)}` },
    ], pointer, { x: 0, y: 0, width, height }, theme);
  }
  return layout;
}
