import type { EquityCurveOptions, EquityPoint, Theme } from '@tradecanvas/commons';
import { withAlpha } from '@tradecanvas/commons';
import {
  AREA_FILL_ALPHA,
  AXIS_GAP,
  BOTTOM_LABELS,
  CHART_PAD,
  LABEL_GAP,
  LABEL_SIZE,
  axisFormat,
  defaultFormat,
  drawLegend,
  drawTooltip,
  drawValueAxis,
  fontOf,
  layoutLegend,
  niceScale,
  scaleToPx,
  strokeHairline,
  timeTicks,
  type LegendLayout,
  type Measure,
  type NiceScale,
  type Rect,
  type TooltipLine,
} from './chartKit.js';

export interface EquityLayout {
  plot: Rect;
  scale: NiceScale;
  /** The curve's first and last time, ms: the benchmark is shown over the same stretch. */
  timeMin: number;
  timeMax: number;
  /** The benchmark's name, over the plot. */
  legend: LegendLayout | null;
}

/** How strongly the fall from a peak is shaded when no colour is given. */
const DRAWDOWN_ALPHA = 0.19;
const DAY = 86_400_000;
/** Room a time label wants along the axis, px. */
const TIME_LABEL_ROOM = 80;
const HOVER_DOT = 3;
const FLAT_RANGE = 0.05;
const DEFAULT_BENCHMARK_LABEL = 'Benchmark';

/** The point of `points` nearest `time`, or -1 when there are none. */
function nearestIndex(points: readonly EquityPoint[], time: number): number {
  let nearest = -1;
  let distance = Infinity;
  for (let i = 0; i < points.length; i++) {
    const d = Math.abs(points[i].time - time);
    if (d < distance) {
      distance = d;
      nearest = i;
    }
  }
  return nearest;
}

/**
 * How the axis's times read, by the step between them: a clock for steps
 * under a day (with the day when the curve runs past one), the day for steps
 * of days, the month and year past a year of curve. Whole days are read in
 * UTC, where the ticks are cut, so a day's tick is not the evening before.
 */
function axisTimeFormat(stepMs: number, rangeMs: number): (ts: number) => string {
  const options: Intl.DateTimeFormatOptions = stepMs < DAY
    ? { ...(rangeMs > DAY ? { month: 'short', day: 'numeric' } : {}), hour: '2-digit', minute: '2-digit' }
    : rangeMs < 365 * DAY ? { month: 'short', day: 'numeric', timeZone: 'UTC' } : { month: 'short', year: 'numeric', timeZone: 'UTC' };
  const format = new Intl.DateTimeFormat(undefined, options);
  return (ts) => format.format(new Date(ts));
}

/** A point's time in full: its day, the year on a curve of a year or more, the clock on one of under a week. */
function pointTimeFormat(rangeMs: number): (ts: number) => string {
  const intraday = rangeMs < 7 * DAY;
  const format = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    ...(rangeMs >= 365 * DAY ? { year: 'numeric' } : {}),
    ...(intraday ? { hour: '2-digit', minute: '2-digit' } : { timeZone: 'UTC' }),
  });
  return (ts) => format.format(new Date(ts));
}

/** The points in order of time: as given when they are, else a sorted copy. */
function byTime(points: readonly EquityPoint[]): readonly EquityPoint[] {
  for (let i = 1; i < points.length; i++) {
    if (points[i].time < points[i - 1].time) return [...points].sort((a, b) => a.time - b.time);
  }
  return points;
}

/** Where the curve goes, for a chart `width` by `height`. */
export function computeEquityLayout(options: EquityCurveOptions, width: number, height: number, measure: Measure, benchmarkColor = ''): EquityLayout {
  const { data, benchmark } = options;
  let lo = Infinity;
  let hi = -Infinity;
  let timeMin = Infinity;
  let timeMax = -Infinity;
  for (const pt of data) {
    if (Number.isFinite(pt.value)) {
      lo = Math.min(lo, pt.value);
      hi = Math.max(hi, pt.value);
    }
    // The curve need not come in order of time.
    if (Number.isFinite(pt.time)) {
      timeMin = Math.min(timeMin, pt.time);
      timeMax = Math.max(timeMax, pt.time);
    }
  }
  for (const pt of benchmark ?? []) {
    if (!Number.isFinite(pt.value)) continue;
    lo = Math.min(lo, pt.value);
    hi = Math.max(hi, pt.value);
  }
  // Values all the same have no range: a twentieth of the value either side, so the line runs through the middle.
  const flat = lo === hi ? Math.abs(lo) * FLAT_RANGE || 1 : 0;
  const scale = niceScale(lo - flat, hi + flat, 5);
  const format = options.valueFormat ?? axisFormat(scale);
  const tickWidth = Math.max(0, ...scale.ticks.map((t) => measure(format(t), LABEL_SIZE)));
  const legend = benchmark && benchmark.length >= 2
    ? layoutLegend([{ label: options.benchmarkLabel ?? DEFAULT_BENCHMARK_LABEL, color: benchmarkColor }], width - CHART_PAD * 2, measure)
    : null;
  const left = CHART_PAD + tickWidth + AXIS_GAP;
  const top = CHART_PAD + (legend ? legend.height + LABEL_GAP : 0);
  const plot: Rect = { x: left, y: top, width: Math.max(1, width - left - CHART_PAD), height: Math.max(1, height - top - CHART_PAD - BOTTOM_LABELS) };
  return { plot, scale, timeMin, timeMax, legend };
}

function drawTimeAxis(ctx: CanvasRenderingContext2D, layout: EquityLayout, width: number, theme: Theme, given: ((ts: number) => string) | undefined): void {
  const { plot, timeMin, timeMax } = layout;
  const ticks = timeTicks(timeMin, timeMax, Math.max(1, Math.floor(plot.width / TIME_LABEL_ROOM)));
  const format = given ?? axisTimeFormat(ticks.length > 1 ? ticks[1] - ticks[0] : timeMax - timeMin, timeMax - timeMin);
  ctx.save();
  ctx.font = fontOf(theme, LABEL_SIZE);
  ctx.fillStyle = theme.axisLabel;
  ctx.strokeStyle = theme.grid;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (const t of ticks) {
    const x = plot.x + ((t - timeMin) / (timeMax - timeMin)) * plot.width;
    strokeHairline(ctx, x, plot.y, x, plot.y + plot.height);
    const text = format(t);
    const half = ctx.measureText(text).width / 2;
    // A label that would run off the chart is left out; its line stays.
    if (x - half >= 0 && x + half <= width) ctx.fillText(text, Math.round(x), plot.y + plot.height + LABEL_GAP);
  }
  ctx.restore();
}

export function renderEquityCurve(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: EquityCurveOptions,
  theme: Theme,
  crosshairPos: { x: number; y: number } | null,
  measure?: Measure,
): void {
  if (width <= 0 || height <= 0) return;
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, width, height);
  if (options.data.length < 2) return;
  const data = byTime(options.data);
  const benchmark = options.benchmark && byTime(options.benchmark);

  const measureText: Measure = measure ?? ((text, size = LABEL_SIZE) => {
    ctx.font = fontOf(theme, size);
    return ctx.measureText(text).width;
  });
  const lineColor = options.lineColor ?? theme.lineColor;
  const benchmarkColor = options.benchmarkColor ?? theme.textSecondary;
  const layout = computeEquityLayout(options, width, height, measureText, benchmarkColor);
  const { plot, scale, timeMin, timeMax, legend } = layout;
  if (!(timeMax >= timeMin)) return;
  const timeRange = timeMax - timeMin || 1;
  const toX = (ts: number): number => plot.x + ((ts - timeMin) / timeRange) * plot.width;
  const toY = (v: number): number => scaleToPx(scale, v, plot.y, plot.height, true);
  const bottom = plot.y + plot.height;
  const formatTime = options.timeFormat ?? pointTimeFormat(timeRange);

  drawValueAxis(ctx, plot, scale, 'vertical', theme, options.valueFormat ?? axisFormat(scale));
  drawTimeAxis(ctx, layout, width, theme, options.timeFormat);
  if (legend) drawLegend(ctx, legend, plot.x, CHART_PAD, theme);

  const trace = (points: readonly EquityPoint[], value: (i: number) => number = (i) => points[i].value): void => {
    ctx.moveTo(toX(points[0].time), toY(value(0)));
    for (let i = 1; i < points.length; i++) ctx.lineTo(toX(points[i].time), toY(value(i)));
  };

  ctx.save();
  // Everything of the curves stays in the plot: a benchmark may run before or past the curve.
  ctx.beginPath();
  ctx.rect(plot.x, plot.y, plot.width, plot.height);
  ctx.clip();

  if (options.drawdown === true) {
    // The gap between the highest value so far and the curve: forward along the peaks, back along the curve.
    const peaks: number[] = [];
    let peak = -Infinity;
    // A value that is no number is no peak: it would make every peak after it none.
    for (const pt of data) peaks.push((peak = Number.isFinite(pt.value) ? Math.max(peak, pt.value) : peak));
    ctx.fillStyle = options.drawdownColor ?? withAlpha(theme.candleDown, DRAWDOWN_ALPHA);
    ctx.beginPath();
    trace(data, (i) => peaks[i]);
    for (let i = data.length - 1; i >= 0; i--) ctx.lineTo(toX(data[i].time), toY(data[i].value));
    ctx.closePath();
    ctx.fill();
  }

  if (options.fillArea === true) {
    const gradient = ctx.createLinearGradient(0, plot.y, 0, bottom);
    gradient.addColorStop(0, withAlpha(lineColor, AREA_FILL_ALPHA));
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    trace(data);
    ctx.lineTo(toX(data[data.length - 1].time), bottom);
    ctx.lineTo(toX(data[0].time), bottom);
    ctx.closePath();
    ctx.fill();
  }

  ctx.lineJoin = 'round';
  if (benchmark && benchmark.length >= 2) {
    ctx.strokeStyle = benchmarkColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    trace(benchmark);
    ctx.stroke();
  }
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = options.lineWidth ?? 1.5;
  ctx.beginPath();
  trace(data);
  ctx.stroke();
  ctx.restore();

  if (!crosshairPos || crosshairPos.x < plot.x || crosshairPos.x > plot.x + plot.width) return;
  // No point is nearest when the times are no numbers: nothing to read out.
  const pt = data[nearestIndex(data, timeMin + ((crosshairPos.x - plot.x) / plot.width) * timeRange)];
  if (!pt) return;
  ctx.save();
  ctx.strokeStyle = theme.crosshair;
  ctx.setLineDash([4, 4]);
  strokeHairline(ctx, toX(pt.time), plot.y, toX(pt.time), bottom);
  ctx.restore();
  ctx.fillStyle = lineColor;
  ctx.beginPath();
  ctx.arc(toX(pt.time), toY(pt.value), HOVER_DOT, 0, Math.PI * 2);
  ctx.fill();

  const format = options.valueFormat ?? defaultFormat;
  const lines: TooltipLine[] = [{ text: formatTime(pt.time), bold: true }, { text: format(pt.value), color: lineColor }];
  // The benchmark has times of its own: read at the pointed time, not at the curve's index.
  const at = benchmark ? nearestIndex(benchmark, pt.time) : -1;
  if (benchmark && at >= 0) {
    lines.push({ text: `${options.benchmarkLabel ?? DEFAULT_BENCHMARK_LABEL}: ${format(benchmark[at].value)}`, color: benchmarkColor });
  }
  drawTooltip(ctx, lines, crosshairPos, { x: 0, y: 0, width, height }, theme);
}
