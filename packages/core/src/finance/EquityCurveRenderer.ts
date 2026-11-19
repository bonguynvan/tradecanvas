import type { EquityBand, EquityCurveOptions, EquityLevel, EquityPoint, Theme } from '@tradecanvas/commons';
import { withAlpha } from '@tradecanvas/commons';
import {
  AREA_FILL_ALPHA,
  AXIS_GAP,
  BOTTOM_LABELS,
  CHART_PAD,
  LABEL_GAP,
  LABEL_SIZE,
  axisFormat,
  dateFormat,
  decimalsFor,
  fixedFormat,
  numberFormat,
  drawLegend,
  drawTooltip,
  drawValueAxis,
  fitText,
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
import { readableText } from './colorScale.js';

export interface EquityLayout {
  plot: Rect;
  scale: NiceScale;
  /** The curve's first and last time, ms: the benchmark is shown over the same stretch. */
  timeMin: number;
  timeMax: number;
  /** The benchmark's name, over the plot. */
  legend: LegendLayout | null;
  /** The levels the scale shows, each with its value as its tag at the axis writes it. */
  tags: LevelTag[];
}

/** A level in view and its value as its tag writes it. */
export interface LevelTag {
  level: EquityLevel;
  text: string;
}

/** How strongly the fall from a peak is shaded when no colour is given. */
const DRAWDOWN_ALPHA = 0.19;
const DAY = 86_400_000;
/** Room a time label wants along the axis, px. */
const TIME_LABEL_ROOM = 80;
const HOVER_DOT = 3;
const FLAT_RANGE = 0.05;
const DEFAULT_BENCHMARK_LABEL = 'Benchmark';
/** How strongly a band is tinted when no colour is given. */
const BAND_ALPHA = 0.12;
/** A level's dash when none is given, px. */
const LEVEL_DASH = [6, 4];
/** Room around a level's value in its tag at the axis, px. */
const TAG_PAD_X = 4;
const TAG_PAD_Y = 2;
/** Room between a level or band and its name, px. */
const NAME_GAP = 3;
/** The rim of background around a name, so it reads where the curve crosses it, px. */
const NAME_HALO = 3;
/** The most of the chart's width a level's tag may take, so a long value cannot squeeze the plot away. */
const MAX_TAG_SHARE = 0.25;

/** Number formats by language and decimals: made once, not on every frame. */
const fixedFormats = new Map<string, (value: number) => string>();

/** `value` with as many decimals as it has, in `locale`. */
function fullFormat(value: number, locale: string | undefined): string {
  const decimals = decimalsFor([value]);
  const key = `${locale ?? ''}|${decimals}`;
  let format = fixedFormats.get(key);
  if (!format) {
    format = fixedFormat(locale, decimals);
    fixedFormats.set(key, format);
  }
  return format(value);
}

/**
 * A level's value as its tag writes it: in full (a price to read off), unless
 * `valueFormat` says how; written as the axis's ticks are when that is too
 * wide for `room`, and cut to fit it all the same.
 */
function tagText(value: number, options: EquityCurveOptions, axis: (value: number) => string, room: number, measure: Measure): string {
  const whole = options.valueFormat ? options.valueFormat(value) : fullFormat(value, options.locale);
  const text = measure(whole, LABEL_SIZE) <= room ? whole : axis(value);
  return fitText(text, room, measure);
}

/** `color` as the canvas reads it (a name or hsl() as hex), so the ink on it can be worked out. */
function resolvedColor(ctx: CanvasRenderingContext2D, color: string): string {
  ctx.save();
  ctx.fillStyle = color;
  const resolved = String(ctx.fillStyle);
  ctx.restore();
  return resolved;
}

/** `text` at (`x`, `y`) on a rim of the background, so a line under it does not cut it. */
function fillName(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, theme: Theme): void {
  ctx.save();
  ctx.strokeStyle = theme.background;
  ctx.lineWidth = NAME_HALO;
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y);
  ctx.restore();
  ctx.fillText(text, x, y);
}

/** The levels whose values are numbers. */
function finiteLevels(options: EquityCurveOptions): EquityLevel[] {
  return (options.levels ?? []).filter((level) => Number.isFinite(level.value));
}

/** The bands whose edges are both numbers. */
function finiteBands(options: EquityCurveOptions): EquityBand[] {
  return (options.bands ?? []).filter((band) => Number.isFinite(band.from) && Number.isFinite(band.to));
}

/** The levels the scale shows: all of them when it was widened for them, else those within it. */
function levelsInView(options: EquityCurveOptions, scale: NiceScale): EquityLevel[] {
  return finiteLevels(options).filter((level) => level.value >= scale.min && level.value <= scale.max);
}

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
 * of days, the month for steps of months. Whole days are read in
 * UTC, where the ticks are cut, so a day's tick is not the evening before.
 */
function axisTimeFormat(stepMs: number, rangeMs: number, locale: string | undefined): (ts: number) => string {
  const options: Intl.DateTimeFormatOptions = stepMs < DAY
    ? { ...(rangeMs > DAY ? { month: 'short', day: 'numeric' } : {}), hour: '2-digit', minute: '2-digit' }
    : stepMs >= 28 * DAY
      // Steps of months stand on the first of each: the month says it all, with the year once the curve runs past one.
      ? { month: 'short', ...(rangeMs >= 365 * DAY ? { year: 'numeric' } : {}), timeZone: 'UTC' }
      : { month: 'short', day: 'numeric', timeZone: 'UTC' };
  return dateFormat(locale, options);
}

/** A point's time in full: its day, the year on a curve of a year or more, the clock on one of under a week. */
function pointTimeFormat(rangeMs: number, locale: string | undefined): (ts: number) => string {
  const intraday = rangeMs < 7 * DAY;
  return dateFormat(locale, {
    month: 'short',
    day: 'numeric',
    ...(rangeMs >= 365 * DAY ? { year: 'numeric' } : {}),
    ...(intraday ? { hour: '2-digit', minute: '2-digit' } : { timeZone: 'UTC' }),
  });
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
  if (options.fitLevels !== false) {
    // Levels and bands in view: the scale reaches them, wherever the curve is.
    for (const level of finiteLevels(options)) {
      lo = Math.min(lo, level.value);
      hi = Math.max(hi, level.value);
    }
    for (const band of finiteBands(options)) {
      lo = Math.min(lo, band.from, band.to);
      hi = Math.max(hi, band.from, band.to);
    }
  }
  // Values all the same have no range: a twentieth of the value either side, so the line runs through the middle.
  const flat = lo === hi ? Math.abs(lo) * FLAT_RANGE || 1 : 0;
  const scale = niceScale(lo - flat, hi + flat, 5);
  const format = options.valueFormat ?? axisFormat(scale, options.locale);
  // A level's value is written in its tag, which wants its room at the axis too.
  const room = Math.max(0, width * MAX_TAG_SHARE - TAG_PAD_X);
  const tags = levelsInView(options, scale).map((level) => ({ level, text: tagText(level.value, options, format, room, measure) }));
  const tickWidth = Math.max(0, ...scale.ticks.map((t) => measure(format(t), LABEL_SIZE)), ...tags.map((tag) => measure(tag.text, LABEL_SIZE) + TAG_PAD_X));
  const legend = benchmark && benchmark.length >= 2
    ? layoutLegend([{ label: options.benchmarkLabel ?? DEFAULT_BENCHMARK_LABEL, color: benchmarkColor }], width - CHART_PAD * 2, measure)
    : null;
  const left = CHART_PAD + tickWidth + AXIS_GAP;
  const top = CHART_PAD + (legend ? legend.height + LABEL_GAP : 0);
  const plot: Rect = { x: left, y: top, width: Math.max(1, width - left - CHART_PAD), height: Math.max(1, height - top - CHART_PAD - BOTTOM_LABELS) };
  return { plot, scale, timeMin, timeMax, legend, tags };
}

function drawTimeAxis(ctx: CanvasRenderingContext2D, layout: EquityLayout, width: number, theme: Theme, given: ((ts: number) => string) | undefined, locale: string | undefined): void {
  const { plot, timeMin, timeMax } = layout;
  const ticks = timeTicks(timeMin, timeMax, Math.max(1, Math.floor(plot.width / TIME_LABEL_ROOM)));
  const format = given ?? axisTimeFormat(ticks.length > 1 ? ticks[1] - ticks[0] : timeMax - timeMin, timeMax - timeMin, locale);
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

/** The bands, tinted across the plot: under everything of the curve. */
function drawBands(ctx: CanvasRenderingContext2D, bands: readonly EquityBand[], plot: Rect, toY: (v: number) => number, theme: Theme): void {
  for (const band of bands) {
    const top = toY(Math.max(band.from, band.to));
    const bottom = toY(Math.min(band.from, band.to));
    ctx.fillStyle = band.color ?? withAlpha(theme.textSecondary, BAND_ALPHA);
    ctx.fillRect(plot.x, top, plot.width, bottom - top);
  }
}

/** The bands' names, each in its top left corner when the band, as it shows in the plot, is tall enough. */
function drawBandNames(ctx: CanvasRenderingContext2D, bands: readonly EquityBand[], plot: Rect, toY: (v: number) => number, theme: Theme, measure: Measure): void {
  ctx.save();
  ctx.font = fontOf(theme, LABEL_SIZE);
  ctx.fillStyle = theme.axisLabel;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  for (const band of bands) {
    if (!band.label) continue;
    const top = Math.max(plot.y, toY(Math.max(band.from, band.to)));
    const bottom = Math.min(plot.y + plot.height, toY(Math.min(band.from, band.to)));
    if (bottom - top < LABEL_SIZE + NAME_GAP * 2) continue;
    fillName(ctx, fitText(band.label, plot.width - LABEL_GAP * 2, measure), plot.x + LABEL_GAP, Math.round(top + NAME_GAP), theme);
  }
  ctx.restore();
}

/** The levels' lines across the plot: one on its top or bottom edge is drawn just inside it. */
function drawLevelLines(ctx: CanvasRenderingContext2D, levels: readonly EquityLevel[], plot: Rect, toY: (v: number) => number, theme: Theme): void {
  ctx.save();
  ctx.lineWidth = 1;
  for (const level of levels) {
    const y = Math.min(plot.y + plot.height - 0.5, Math.max(plot.y + 0.5, Math.round(toY(level.value)) + 0.5));
    ctx.strokeStyle = level.color ?? theme.textSecondary;
    ctx.setLineDash(level.dash ?? LEVEL_DASH);
    ctx.beginPath();
    ctx.moveTo(plot.x, y);
    ctx.lineTo(plot.x + plot.width, y);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Each level's name in the plot at its line's right end, over the line (under
 * it at the plot's top), and its value in a tag of its colour at the axis,
 * over the axis's own labels.
 */
function drawLevelMarks(
  ctx: CanvasRenderingContext2D,
  tags: readonly LevelTag[],
  plot: Rect,
  toY: (v: number) => number,
  theme: Theme,
  measure: Measure,
): void {
  ctx.save();
  ctx.font = fontOf(theme, LABEL_SIZE);
  const tagHeight = LABEL_SIZE + TAG_PAD_Y * 2;
  for (const { level, text: value } of tags) {
    const y = Math.round(toY(level.value));
    const color = level.color ?? theme.textSecondary;
    if (level.label) {
      const above = y - plot.y >= LABEL_SIZE + NAME_GAP;
      ctx.fillStyle = color;
      ctx.textAlign = 'right';
      ctx.textBaseline = above ? 'bottom' : 'top';
      fillName(ctx, fitText(level.label, plot.width - LABEL_GAP * 2, measure), plot.x + plot.width - LABEL_GAP, above ? y - NAME_GAP : y + NAME_GAP, theme);
    }
    const tagWidth = ctx.measureText(value).width + LABEL_GAP + TAG_PAD_X;
    ctx.fillStyle = color;
    ctx.fillRect(plot.x - tagWidth, y - tagHeight / 2, tagWidth, tagHeight);
    ctx.fillStyle = readableText(resolvedColor(ctx, color));
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(value, plot.x - LABEL_GAP, y);
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
  const formatTime = options.timeFormat ?? pointTimeFormat(timeRange, options.locale);

  drawValueAxis(ctx, plot, scale, 'vertical', theme, options.valueFormat ?? axisFormat(scale, options.locale));
  drawTimeAxis(ctx, layout, width, theme, options.timeFormat, options.locale);
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

  const bands = finiteBands(options);
  const levels = layout.tags.map((tag) => tag.level);
  drawBands(ctx, bands, plot, toY, theme);

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

  // Under the curves, so the curve reads where it crosses one.
  drawLevelLines(ctx, levels, plot, toY, theme);

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

  drawBandNames(ctx, bands, plot, toY, theme, measureText);
  drawLevelMarks(ctx, layout.tags, plot, toY, theme, measureText);

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

  const format = options.valueFormat ?? numberFormat(options.locale);
  const lines: TooltipLine[] = [{ text: formatTime(pt.time), bold: true }, { text: format(pt.value), color: lineColor }];
  // The benchmark has times of its own: read at the pointed time, not at the curve's index.
  const at = benchmark ? nearestIndex(benchmark, pt.time) : -1;
  if (benchmark && at >= 0) {
    lines.push({ text: `${options.benchmarkLabel ?? DEFAULT_BENCHMARK_LABEL}: ${format(benchmark[at].value)}`, color: benchmarkColor });
  }
  drawTooltip(ctx, lines, crosshairPos, { x: 0, y: 0, width, height }, theme);
}
