import type { CounterClockOptions, CounterClockPoint, OHLCBar, Theme } from '@tradecanvas/commons';
import { TC_SERIES_COLORS, withAlpha } from '@tradecanvas/commons';
import {
  LABEL_SIZE,
  axisFormat,
  canvasMeasure,
  defaultFormat,
  drawTooltip,
  drawValueAxis,
  fontOf,
  niceScale,
  scaleToPx,
  type Measure,
  type NiceScale,
  type Rect,
} from './chartKit.js';

const PAD = 12;
const TITLE_ROOM = 18;
const X_LABEL_ROOM = 20;
/** How near the pointer finds a point, px. */
const REACH = 10;
/** The oldest point's opacity; the newest is drawn in full. */
const OLDEST_ALPHA = 0.2;
/** Points drawn at most. */
export const MAX_CLOCK_POINTS = 2000;
/** Moves and ranges smaller than this share of the values are rounding, not moves. */
const NOISE = 1e-9;

/**
 * Average volume and average close over each run of `period` bars, one point
 * per bar from the first full run: the path a counter-clock chart draws.
 * `last` keeps only the newest points. Each run is summed afresh, so equal
 * closes give equal averages, with no rounding drift between them.
 */
export function counterClockPoints(data: readonly OHLCBar[], period: number, last = Infinity): CounterClockPoint[] {
  const n = Number.isFinite(period) ? Math.max(1, Math.floor(period)) : 25;
  const out: CounterClockPoint[] = [];
  const first = Math.max(n - 1, data.length - (Number.isFinite(last) ? Math.max(1, Math.floor(last)) : data.length));
  for (let i = first; i < data.length; i++) {
    let volume = 0;
    let price = 0;
    for (let j = i - n + 1; j <= i; j++) {
      volume += data[j].volume;
      price += data[j].close;
    }
    out.push({ time: data[i].time, volume: volume / n, price: price / n });
  }
  return out;
}

/** Whether `lo`–`hi` is wider than rounding at their size. */
const spans = (lo: number, hi: number) => hi - lo > NOISE * Math.max(Math.abs(lo), Math.abs(hi));

/**
 * The direction of the last move, as one of eight phases counter-clockwise
 * from volume rising at a steady price: 1 volume up, 2 both up, 3 price up,
 * 4 price up on falling volume, 5 volume down, 6 both down, 7 price down,
 * 8 price down on rising volume. Moves are read against the points' ranges,
 * so a phase doesn't depend on the units. Null without a move.
 */
export function counterClockPhase(points: readonly CounterClockPoint[]): number | null {
  if (points.length < 2) return null;
  let vLo = Infinity;
  let vHi = -Infinity;
  let pLo = Infinity;
  let pHi = -Infinity;
  for (const p of points) {
    vLo = Math.min(vLo, p.volume);
    vHi = Math.max(vHi, p.volume);
    pLo = Math.min(pLo, p.price);
    pHi = Math.max(pHi, p.price);
  }
  const a = points[points.length - 2];
  const b = points[points.length - 1];
  const dv = spans(vLo, vHi) ? (b.volume - a.volume) / (vHi - vLo) : 0;
  const dp = spans(pLo, pHi) ? (b.price - a.price) / (pHi - pLo) : 0;
  if (Math.abs(dv) < 1e-6 && Math.abs(dp) < 1e-6) return null;
  const turn = (Math.atan2(dp, dv) + 2 * Math.PI) % (2 * Math.PI);
  return (Math.round(turn / (Math.PI / 4)) % 8) + 1;
}

export interface PlacedClockPoint {
  px: number;
  py: number;
  alpha: number;
  point: CounterClockPoint;
}

export interface CounterClockLayout {
  plot: Rect;
  xScale: NiceScale;
  yScale: NiceScale;
  points: PlacedClockPoint[];
  /** The newest move's phase, 1–8, or null. */
  phase: number | null;
  color: string;
}

/** The plot and the newest points' places, for a chart `width` × `height`. */
export function computeCounterClockLayout(options: CounterClockOptions, width: number, height: number, _theme: Theme, measure: Measure): CounterClockLayout {
  const shown = counterClockPoints(options.data, options.period ?? 25, shownCount(options));
  let vLo = Infinity;
  let vHi = -Infinity;
  let pLo = Infinity;
  let pHi = -Infinity;
  for (const p of shown) {
    vLo = Math.min(vLo, p.volume);
    vHi = Math.max(vHi, p.volume);
    pLo = Math.min(pLo, p.price);
    pHi = Math.max(pHi, p.price);
  }
  // A range no wider than rounding is one value: the scale opens up around it.
  if (shown.length > 0 && !spans(vLo, vHi)) vHi = vLo;
  if (shown.length > 0 && !spans(pLo, pHi)) pHi = pLo;
  const xScale = niceScale(shown.length > 0 ? vLo : 0, shown.length > 0 ? vHi : 1, Math.max(2, Math.floor(width / 110)));
  const yScale = niceScale(shown.length > 0 ? pLo : 0, shown.length > 0 ? pHi : 1, Math.max(2, Math.floor(height / 60)));
  const yFormat = options.priceFormat ?? axisFormat(yScale);
  const xFormat = options.volumeFormat ?? axisFormat(xScale);
  const tickWidth = Math.max(0, ...yScale.ticks.map((t) => measure(yFormat(t), LABEL_SIZE)));
  const left = PAD + tickWidth + 8 + (options.yLabel ? TITLE_ROOM : 0);
  const right = PAD + measure(xFormat(xScale.max), LABEL_SIZE) / 2;
  const top = PAD;
  const bottom = PAD + X_LABEL_ROOM + (options.xLabel ? TITLE_ROOM : 0);
  const plot = { x: left, y: top, width: Math.max(1, width - left - right), height: Math.max(1, height - top - bottom) };
  const last = Math.max(1, shown.length - 1);
  const points = shown.map((point, i) => ({
    px: scaleToPx(xScale, point.volume, plot.x, plot.width),
    py: scaleToPx(yScale, point.price, plot.y, plot.height, true),
    alpha: OLDEST_ALPHA + ((1 - OLDEST_ALPHA) * i) / last,
    point,
  }));
  return { plot, xScale, yScale, points, phase: counterClockPhase(shown), color: options.color ?? TC_SERIES_COLORS[0] };
}

/** How many of the newest points a chart shows: `points`, 2 to MAX_CLOCK_POINTS. */
export function shownCount(options: Pick<CounterClockOptions, 'points'>): number {
  const asked = options.points ?? 60;
  return Number.isFinite(asked) ? Math.min(MAX_CLOCK_POINTS, Math.max(2, Math.floor(asked))) : 60;
}

/** The point nearest the pointer, within reach; the newest wins a tie. */
export function nearestCounterClockPoint(layout: CounterClockLayout, x: number, y: number): PlacedClockPoint | null {
  let best: PlacedClockPoint | null = null;
  let bestDist = REACH * REACH;
  for (let i = layout.points.length - 1; i >= 0; i--) {
    const p = layout.points[i];
    const d = (p.px - x) ** 2 + (p.py - y) ** 2;
    if (d < bestDist) {
      best = p;
      bestDist = d;
    }
  }
  return best;
}

const dateFormat = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

export function renderCounterClock(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: CounterClockOptions,
  theme: Theme,
  pointer: { x: number; y: number } | null,
  layout: CounterClockLayout = computeCounterClockLayout(options, width, height, theme, canvasMeasure(ctx, theme)),
): CounterClockLayout {
  const { plot, points, color } = layout;
  const timeFormat = options.timeFormat ?? ((t: number) => dateFormat.format(new Date(t)));
  const priceFormat = options.priceFormat ?? defaultFormat;
  const volumeFormat = options.volumeFormat ?? defaultFormat;
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, width, height);
  drawValueAxis(ctx, plot, layout.yScale, 'vertical', theme, options.priceFormat ?? axisFormat(layout.yScale));
  drawValueAxis(ctx, plot, layout.xScale, 'horizontal', theme, options.volumeFormat ?? axisFormat(layout.xScale));
  drawTitles(ctx, plot, options, theme);

  ctx.save();
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  for (let i = 1; i < points.length; i++) {
    ctx.strokeStyle = withAlpha(color, points[i].alpha);
    ctx.beginPath();
    ctx.moveTo(points[i - 1].px, points[i - 1].py);
    ctx.lineTo(points[i].px, points[i].py);
    ctx.stroke();
  }
  for (const p of points) {
    ctx.fillStyle = withAlpha(color, p.alpha);
    ctx.beginPath();
    ctx.arc(p.px, p.py, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  const newest = points[points.length - 1];
  if (newest) {
    ctx.fillStyle = color;
    ctx.strokeStyle = theme.background;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(newest.px, newest.py, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  const hovered = pointer && options.crosshair !== false ? nearestCounterClockPoint(layout, pointer.x, pointer.y) : null;
  if (hovered && pointer) {
    ctx.save();
    ctx.strokeStyle = theme.text;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(hovered.px, hovered.py, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    drawTooltip(ctx, [
      { text: timeFormat(hovered.point.time), bold: true, color },
      { text: `${options.yLabel ?? 'Price'}: ${priceFormat(hovered.point.price)}` },
      { text: `${options.xLabel ?? 'Volume'}: ${volumeFormat(hovered.point.volume)}` },
    ], pointer, { x: 0, y: 0, width, height }, theme);
  }
  return layout;
}

function drawTitles(ctx: CanvasRenderingContext2D, plot: Rect, options: CounterClockOptions, theme: Theme): void {
  ctx.save();
  ctx.font = fontOf(theme, LABEL_SIZE);
  ctx.fillStyle = theme.textSecondary;
  ctx.textAlign = 'center';
  if (options.xLabel) {
    ctx.textBaseline = 'bottom';
    ctx.fillText(options.xLabel, plot.x + plot.width / 2, plot.y + plot.height + X_LABEL_ROOM + TITLE_ROOM);
  }
  if (options.yLabel) {
    ctx.translate(PAD + 4, plot.y + plot.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textBaseline = 'middle';
    ctx.fillText(options.yLabel, 0, 0);
  }
  ctx.restore();
}
