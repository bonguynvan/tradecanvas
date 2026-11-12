import type { Theme } from '@tradecanvas/commons';
import { TC_SERIES_COLORS, withAlpha } from '@tradecanvas/commons';
import { toPixel } from '../charts/pixelGrid.js';

/** How wide `text` is at a font size, px (the canvas's measureText, or a stand-in in tests). */
export type Measure = (text: string, size?: number) => number;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NiceScale {
  min: number;
  max: number;
  step: number;
  ticks: number[];
}

/** How strongly a line's colour fills the area under it. */
export const AREA_FILL_ALPHA = 0.25;
/**
 * The room the finance charts leave, px, on the even ladder the widget is
 * spaced by (4, 6, 8, 12): between the chart's edge and what it draws,
 * between an axis and its labels, between a plot and the labels under it,
 * and the height those labels take.
 */
export const CHART_PAD = 12;
export const AXIS_GAP = 8;
export const LABEL_GAP = 6;
export const BOTTOM_LABELS = 20;
/** Room for a label's text around it, px. */
export const LABEL_SIZE = 11;
const LEGEND_SWATCH = 10;
const LEGEND_GAP = 6;
const LEGEND_ITEM_GAP = 16;
const LEGEND_ROW = 18;
const TOOLTIP_PAD = 8;
const TOOLTIP_LINE = 16;

const MAX_DECIMALS = 15;
const UNIT_SCALE: NiceScale = { min: 0, max: 1, step: 0.2, ticks: [0, 0.2, 0.4, 0.6, 0.8, 1] };

/** Decimals in a step, for printing ticks without float dust. */
function stepDecimals(step: number): number {
  for (let d = 0; d <= MAX_DECIMALS; d++) {
    const scaled = step * 10 ** d;
    const whole = Math.round(scaled);
    // Relative slack: a step of 1e-13 is not "0 at 0 decimals".
    if (whole !== 0 && Math.abs(whole - scaled) < 1e-9 * Math.abs(scaled)) return d;
  }
  return MAX_DECIMALS;
}

const clean = (value: number, decimals: number) => {
  const v = Number(value.toFixed(decimals));
  return v === 0 ? 0 : v;
};

/**
 * A scale over `min`–`max` in whole steps of 1, 2, 2.5 or 5 times a power
 * of ten, about `maxTicks` of them; a range of one value is opened up around it.
 */
export function niceScale(min: number, max: number, maxTicks = 5): NiceScale {
  let lo = Math.min(min, max);
  let hi = Math.max(min, max);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
    lo = 0;
    hi = 1;
  }
  if (lo === hi) {
    const span = Math.abs(lo) || 1;
    lo -= span / 2;
    hi += span / 2;
  }
  // Halves first, so a range near the largest numbers doesn't overflow.
  const raw = ((hi / 2 - lo / 2) / Math.max(1, maxTicks)) * 2;
  if (!Number.isFinite(raw) || raw <= 0) return UNIT_SCALE;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / magnitude;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  const step = nice * magnitude;
  if (!Number.isFinite(step) || step <= 0) return UNIT_SCALE;
  const decimals = stepDecimals(step);
  const first = Math.floor(lo / step + 1e-9);
  const last = Math.ceil(hi / step - 1e-9);
  const ticks: number[] = [];
  for (let k = first; k <= last; k++) ticks.push(clean(k * step, decimals));
  if (ticks.length < 2 || !ticks.every(Number.isFinite)) return UNIT_SCALE;
  return { min: ticks[0], max: ticks[ticks.length - 1], step: clean(step, decimals), ticks };
}

/** Where `value` falls along a span of pixels, `start` at the scale's min (or max when `inverted`). */
export function scaleToPx(scale: NiceScale, value: number, start: number, length: number, inverted = false): number {
  const t = scale.max === scale.min ? 0.5 : (value - scale.min) / (scale.max - scale.min);
  return inverted ? start + length * (1 - t) : start + length * t;
}

const plain = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });

/** Numbers as people read them: 1,234.5, and 12.3K past ten thousand. */
export function defaultFormat(value: number): string {
  return Math.abs(value) >= 10_000 ? compact.format(value) : plain.format(value);
}

/**
 * How a scale's ticks read: as many decimals as its step needs, and 20K or
 * 1.5M when that keeps every tick apart.
 */
export function axisFormat(scale: NiceScale): (value: number) => string {
  const decimals = stepDecimals(scale.step);
  const fixed = new Intl.NumberFormat(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const big = Math.max(Math.abs(scale.min), Math.abs(scale.max)) >= 10_000;
  if (big && scale.step % 1000 === 0) {
    const short = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 2 });
    const labels = scale.ticks.map((t) => short.format(t));
    if (new Set(labels).size === labels.length) return (value) => short.format(value);
  }
  return (value) => fixed.format(value);
}

/** A series' colour: its own, else the palette's in turn. */
export function seriesColor(index: number, color?: string): string {
  return color ?? TC_SERIES_COLORS[index % TC_SERIES_COLORS.length];
}

export function fontOf(theme: Theme, size: number, weight = ''): string {
  return `${weight ? `${weight} ` : ''}${size}px ${theme.font.family}`;
}

/** A Measure from a canvas, in the theme's font. */
export function canvasMeasure(ctx: CanvasRenderingContext2D, theme: Theme): Measure {
  return (text, size = LABEL_SIZE) => {
    ctx.font = fontOf(theme, size);
    return ctx.measureText(text).width;
  };
}

export interface LegendItem {
  label: string;
  color: string;
}

export interface LegendLayout {
  items: (LegendItem & { x: number; y: number })[];
  rows: number;
  height: number;
}

/** Legend entries in rows that fit `maxWidth`, from (0, 0); `column`: one entry a row. */
export function layoutLegend(items: readonly LegendItem[], maxWidth: number, measure: Measure, column = false): LegendLayout {
  const placed: LegendLayout['items'] = [];
  let x = 0;
  let row = 0;
  for (const item of items) {
    const width = LEGEND_SWATCH + LEGEND_GAP + measure(item.label, LABEL_SIZE);
    if (x > 0 && (column || x + width > maxWidth)) {
      row++;
      x = 0;
    }
    placed.push({ ...item, x, y: row * LEGEND_ROW });
    x += width + LEGEND_ITEM_GAP;
  }
  const rows = items.length === 0 ? 0 : row + 1;
  return { items: placed, rows, height: rows * LEGEND_ROW };
}

export function drawLegend(ctx: CanvasRenderingContext2D, layout: LegendLayout, ox: number, oy: number, theme: Theme): void {
  ctx.save();
  ctx.font = fontOf(theme, LABEL_SIZE);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  for (const item of layout.items) {
    const cy = oy + item.y + LEGEND_ROW / 2;
    ctx.fillStyle = item.color;
    ctx.fillRect(ox + item.x, cy - LEGEND_SWATCH / 2, LEGEND_SWATCH, LEGEND_SWATCH);
    ctx.fillStyle = theme.textSecondary;
    ctx.fillText(item.label, ox + item.x + LEGEND_SWATCH + LEGEND_GAP, cy);
  }
  ctx.restore();
}

export interface TooltipLine {
  text: string;
  /** A swatch before the text. */
  color?: string;
  bold?: boolean;
}

/** A box of lines by the pointer, kept inside `bounds`. */
export function drawTooltip(
  ctx: CanvasRenderingContext2D,
  lines: readonly TooltipLine[],
  anchor: { x: number; y: number },
  bounds: Rect,
  theme: Theme,
): void {
  if (lines.length === 0) return;
  ctx.save();
  const swatch = lines.some((l) => l.color) ? LEGEND_SWATCH + LEGEND_GAP : 0;
  let width = 0;
  for (const line of lines) {
    ctx.font = fontOf(theme, LABEL_SIZE, line.bold ? '600' : '');
    width = Math.max(width, ctx.measureText(line.text).width);
  }
  const w = width + swatch + TOOLTIP_PAD * 2;
  const h = lines.length * TOOLTIP_LINE + TOOLTIP_PAD * 2 - 4;
  let x = anchor.x + 14;
  let y = anchor.y + 14;
  if (x + w > bounds.x + bounds.width) x = anchor.x - 14 - w;
  if (y + h > bounds.y + bounds.height) y = anchor.y - 14 - h;
  x = Math.max(bounds.x, x);
  y = Math.max(bounds.y, y);
  ctx.fillStyle = withAlpha(theme.axisLabelBackground, 0.94);
  ctx.strokeStyle = theme.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, 6);
  else ctx.rect(x, y, w, h);
  ctx.fill();
  ctx.stroke();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  lines.forEach((line, i) => {
    const cy = y + TOOLTIP_PAD + i * TOOLTIP_LINE + TOOLTIP_LINE / 2 - 2;
    if (line.color) {
      ctx.fillStyle = line.color;
      ctx.fillRect(x + TOOLTIP_PAD, cy - 4, 8, 8);
    }
    ctx.font = fontOf(theme, LABEL_SIZE, line.bold ? '600' : '');
    ctx.fillStyle = line.bold ? theme.text : theme.textSecondary;
    ctx.fillText(line.text, x + TOOLTIP_PAD + swatch, cy);
  });
  ctx.restore();
}

/** Where a one-pixel line goes to fall on whole device pixels, in the canvas's own units. */
export interface Hairline {
  /** The x of a vertical line through `v`. */
  x(v: number): number;
  /** The y of a horizontal line through `v`. */
  y(v: number): number;
  /** The line's width: one CSS pixel, held to whole device pixels. */
  width: number;
}

/**
 * Hairlines for the canvas as it is scaled now. A line one pixel wide drawn
 * at a fraction of a device pixel spreads over two at half strength; at a
 * ratio like 1.25 or 1.5 that is every line placed by rounding CSS pixels.
 * A canvas whose transform can't be read (a test stand-in) is taken as 1:1.
 */
export function hairline(ctx: CanvasRenderingContext2D): Hairline {
  const m = typeof ctx.getTransform === 'function' ? ctx.getTransform() : undefined;
  const a = m && Number.isFinite(m.a) && m.a > 0 ? m.a : 1;
  const d = m && Number.isFinite(m.d) && m.d > 0 ? m.d : 1;
  const e = m && Number.isFinite(m.e) ? m.e : 0;
  const f = m && Number.isFinite(m.f) ? m.f : 0;
  const px = Math.max(1, Math.floor(a));
  return {
    x: (v) => (toPixel(v * a + e - px / 2) + px / 2 - e) / a,
    y: (v) => (toPixel(v * d + f - px / 2) + px / 2 - f) / d,
    width: px / a,
  };
}

/** A straight one-pixel line from (x1, y1) to (x2, y2), level or upright, on whole device pixels. */
export function strokeHairline(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
  const line = hairline(ctx);
  ctx.lineWidth = line.width;
  ctx.beginPath();
  if (y1 === y2) {
    const y = line.y(y1);
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
  } else {
    const x = line.x(x1);
    ctx.moveTo(x, y1);
    ctx.lineTo(x, y2);
  }
  ctx.stroke();
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
/** Steps a time axis may take: the round ones of a clock and a calendar. */
const TIME_STEPS = [MINUTE, 5 * MINUTE, 15 * MINUTE, 30 * MINUTE, HOUR, 2 * HOUR, 4 * HOUR, 12 * HOUR, DAY, 2 * DAY, 7 * DAY, 14 * DAY, 30 * DAY, 91 * DAY, 182 * DAY, 365 * DAY];

/**
 * Up to `maxTicks` times between `min` and `max` (ms), a round step apart
 * and on that step's own marks: whole hours, whole days (UTC), not multiples
 * of whatever the range divides into.
 */
export function timeTicks(min: number, max: number, maxTicks: number): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return [];
  const want = (max - min) / Math.max(1, maxTicks);
  let step = TIME_STEPS.find((s) => s >= want);
  // Past a year a step: whole years, as many as it takes.
  if (step === undefined) step = Math.ceil(want / (365 * DAY)) * 365 * DAY;
  const ticks: number[] = [];
  for (let t = Math.ceil(min / step) * step; t <= max; t += step) ticks.push(t);
  return ticks;
}

/** The decimals it takes to write every one of `values` in full, up to `cap`. */
export function decimalsFor(values: Iterable<number>, cap = 8): number {
  let decimals = 0;
  for (const v of values) {
    if (!Number.isFinite(v)) continue;
    while (decimals < cap && Math.abs(v * 10 ** decimals - Math.round(v * 10 ** decimals)) > 1e-9 * Math.max(1, Math.abs(v * 10 ** decimals))) decimals++;
  }
  return decimals;
}

/** Grid lines and labels of a value scale along one side of the plot. */
export function drawValueAxis(
  ctx: CanvasRenderingContext2D,
  plot: Rect,
  scale: NiceScale,
  orientation: 'vertical' | 'horizontal',
  theme: Theme,
  format: (value: number) => string,
): void {
  ctx.save();
  ctx.font = fontOf(theme, LABEL_SIZE);
  ctx.fillStyle = theme.axisLabel;
  ctx.strokeStyle = theme.grid;
  for (const tick of scale.ticks) {
    if (orientation === 'vertical') {
      const y = scaleToPx(scale, tick, plot.y, plot.height, true);
      strokeHairline(ctx, plot.x, y, plot.x + plot.width, y);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(format(tick), plot.x - LABEL_GAP, Math.round(y));
    } else {
      const x = scaleToPx(scale, tick, plot.x, plot.width);
      strokeHairline(ctx, x, plot.y, x, plot.y + plot.height);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(format(tick), Math.round(x), plot.y + plot.height + LABEL_GAP);
    }
  }
  ctx.restore();
}

/** `text` cut with an ellipsis to fit `width`. */
export function fitText(text: string, width: number, measure: Measure, size = LABEL_SIZE): string {
  if (measure(text, size) <= width) return text;
  let cut = text;
  while (cut.length > 1 && measure(`${cut}…`, size) > width) cut = cut.slice(0, -1);
  return cut.length > 1 ? `${cut}…` : '';
}
