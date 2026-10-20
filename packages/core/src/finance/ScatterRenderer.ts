import type { ScatterChartOptions, ScatterPoint, Theme } from '@tradecanvas/commons';
import { withAlpha } from '@tradecanvas/commons';
import {
  LABEL_SIZE,
  axisFormat,
  canvasMeasure,
  defaultFormat,
  drawLegend,
  drawTooltip,
  drawValueAxis,
  fontOf,
  layoutLegend,
  niceScale,
  scaleToPx,
  seriesColor,
  type LegendLayout,
  type Measure,
  type NiceScale,
  type Rect,
  type TooltipLine,
} from './chartKit.js';

export interface PlacedPoint {
  px: number;
  py: number;
  r: number;
  color: string;
  /** Its fill, and its fill while hovered (worked out once, not each frame). */
  fill: string;
  hoverFill: string;
  series: string;
  label?: string;
  point: ScatterPoint;
}

export interface ScatterLayout {
  plot: Rect;
  xScale: NiceScale;
  yScale: NiceScale;
  points: PlacedPoint[];
  /** Indexes into `points`, largest bubble first: small ones are drawn on top. */
  drawOrder: number[];
  legend: LegendLayout | null;
}

const PAD = 12;
const DEFAULT_RADIUS = 5;
const MIN_RADIUS = 3;
const TITLE_ROOM = 18;
const X_LABEL_ROOM = 20;
/** How far from a point the pointer still finds it, px past its edge. */
const REACH = 6;

/** The plot and every point's place, for a chart `width` × `height`. */
export function computeScatterLayout(options: ScatterChartOptions, width: number, height: number, _theme: Theme, measure: Measure): ScatterLayout {
  // One pass over the points (a spread into Math.min would overflow the stack past ~100k).
  let xLo = Infinity;
  let xHi = -Infinity;
  let yLo = Infinity;
  let yHi = -Infinity;
  let maxSize = 0;
  for (const s of options.series) {
    for (const p of s.points) {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
      if (p.x < xLo) xLo = p.x;
      if (p.x > xHi) xHi = p.x;
      if (p.y < yLo) yLo = p.y;
      if (p.y > yHi) yHi = p.y;
      if (p.size !== undefined && Number.isFinite(p.size) && p.size > maxSize) maxSize = p.size;
    }
  }
  // Room for the largest bubble at either end, so none is cut by the plot's edge,
  // without taking data on one side of zero across it.
  const maxRadius = options.maxRadius ?? 24;
  const reach = maxRadius + REACH;
  const padded = (lo: number, hi: number, pixels: number): [number, number] => {
    if (lo > hi) return [0, 1];
    const pad = ((hi - lo) * reach) / Math.max(1, pixels - reach * 2);
    return [lo >= 0 ? Math.max(0, lo - pad) : lo - pad, hi <= 0 ? Math.min(0, hi + pad) : hi + pad];
  };
  const xScale = niceScale(...padded(xLo, xHi, width * 0.8), Math.max(2, Math.floor(width / 110)));
  const yScale = niceScale(...padded(yLo, yHi, height * 0.7), 5);
  const xFormat = options.xFormat ?? axisFormat(xScale);
  const yFormat = options.yFormat ?? axisFormat(yScale);

  const showLegend = options.legend ?? options.series.length > 1;
  const legend = showLegend
    ? layoutLegend(options.series.map((s, i) => ({ label: s.name, color: seriesColor(i, s.color) })), width - PAD * 2, measure)
    : null;
  const top = PAD + (legend ? legend.height + 6 : 0);
  const tickWidth = Math.max(0, ...yScale.ticks.map((t) => measure(yFormat(t), LABEL_SIZE)));
  const left = PAD + (options.yLabel ? TITLE_ROOM : 0) + tickWidth + 8;
  const bottom = PAD + X_LABEL_ROOM + (options.xLabel ? TITLE_ROOM : 0);
  const lastTick = measure(xFormat(xScale.max), LABEL_SIZE) / 2;
  const plot = { x: left, y: top, width: Math.max(1, width - left - PAD - lastTick), height: Math.max(1, height - top - bottom) };

  const points: PlacedPoint[] = [];
  options.series.forEach((s, si) => {
    const color = seriesColor(si, s.color);
    const fill = withAlpha(color, 0.55);
    const hoverFill = withAlpha(color, 0.85);
    for (const point of s.points) {
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
      // A bubble's area follows its size.
      const sized = point.size !== undefined && Number.isFinite(point.size) && point.size > 0 && maxSize > 0;
      const r = sized ? Math.max(MIN_RADIUS, maxRadius * Math.sqrt(point.size! / maxSize)) : DEFAULT_RADIUS;
      points.push({
        px: scaleToPx(xScale, point.x, plot.x, plot.width),
        py: scaleToPx(yScale, point.y, plot.y, plot.height, true),
        r,
        color,
        fill,
        hoverFill,
        series: s.name,
        label: point.label,
        point,
      });
    }
  });
  const drawOrder = points.map((_, i) => i).sort((a, b) => points[b].r - points[a].r);
  return { plot, xScale, yScale, points, drawOrder, legend };
}

/** The point nearest (x, y) within reach of its edge; null when none is. */
export function nearestPoint(layout: ScatterLayout, x: number, y: number): PlacedPoint | null {
  let best: PlacedPoint | null = null;
  let bestDistance = Infinity;
  for (const p of layout.points) {
    const d = Math.hypot(p.px - x, p.py - y);
    if (d <= p.r + REACH && d < bestDistance) {
      best = p;
      bestDistance = d;
    }
  }
  return best;
}

export function renderScatter(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: ScatterChartOptions,
  theme: Theme,
  pointer: { x: number; y: number } | null,
  layout: ScatterLayout = computeScatterLayout(options, width, height, theme, canvasMeasure(ctx, theme)),
): ScatterLayout {
  const { plot, xScale, yScale } = layout;
  const xFormat = options.xFormat ?? axisFormat(xScale);
  const yFormat = options.yFormat ?? axisFormat(yScale);

  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, width, height);
  if (layout.legend) drawLegend(ctx, layout.legend, PAD, PAD, theme);
  drawValueAxis(ctx, plot, yScale, 'vertical', theme, yFormat);
  drawValueAxis(ctx, plot, xScale, 'horizontal', theme, xFormat);
  if (options.zeroLines !== false) drawZeroLines(ctx, layout, theme);
  drawTitles(ctx, layout, options, theme);

  const hovered = pointer && options.crosshair !== false ? nearestPoint(layout, pointer.x, pointer.y) : null;
  ctx.save();
  ctx.beginPath();
  ctx.rect(plot.x, plot.y, plot.width, plot.height);
  ctx.clip();
  // Larger bubbles first, so small ones stay on top and can be pointed at.
  for (const i of layout.drawOrder) {
    const p = layout.points[i];
    ctx.beginPath();
    ctx.arc(p.px, p.py, p === hovered ? p.r + 2 : p.r, 0, Math.PI * 2);
    ctx.fillStyle = p === hovered ? p.hoverFill : p.fill;
    ctx.fill();
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();

  if (options.showLabels) {
    ctx.save();
    ctx.font = fontOf(theme, LABEL_SIZE - 1);
    ctx.fillStyle = theme.textSecondary;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (const p of layout.points) if (p.label) ctx.fillText(p.label, p.px + p.r + 4, p.py);
    ctx.restore();
  }

  if (hovered && pointer) {
    const lines: TooltipLine[] = [{ text: hovered.label ?? hovered.series, bold: true, color: hovered.color }];
    if (hovered.label && options.series.length > 1) lines.push({ text: hovered.series });
    lines.push({ text: `${options.xLabel ?? 'x'}: ${(options.xFormat ?? defaultFormat)(hovered.point.x)}` });
    lines.push({ text: `${options.yLabel ?? 'y'}: ${(options.yFormat ?? defaultFormat)(hovered.point.y)}` });
    if (hovered.point.size !== undefined) lines.push({ text: defaultFormat(hovered.point.size) });
    drawTooltip(ctx, lines, pointer, { x: 0, y: 0, width, height }, theme);
  }
  return layout;
}

function drawZeroLines(ctx: CanvasRenderingContext2D, layout: ScatterLayout, theme: Theme): void {
  const { plot, xScale, yScale } = layout;
  ctx.save();
  ctx.strokeStyle = theme.axisLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (xScale.min < 0 && xScale.max > 0) {
    const x = Math.round(scaleToPx(xScale, 0, plot.x, plot.width)) + 0.5;
    ctx.moveTo(x, plot.y);
    ctx.lineTo(x, plot.y + plot.height);
  }
  if (yScale.min < 0 && yScale.max > 0) {
    const y = Math.round(scaleToPx(yScale, 0, plot.y, plot.height, true)) + 0.5;
    ctx.moveTo(plot.x, y);
    ctx.lineTo(plot.x + plot.width, y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawTitles(ctx: CanvasRenderingContext2D, layout: ScatterLayout, options: ScatterChartOptions, theme: Theme): void {
  const { plot } = layout;
  ctx.save();
  ctx.font = fontOf(theme, LABEL_SIZE, '600');
  ctx.fillStyle = theme.textSecondary;
  ctx.textAlign = 'center';
  if (options.xLabel) {
    ctx.textBaseline = 'bottom';
    ctx.fillText(options.xLabel, plot.x + plot.width / 2, plot.y + plot.height + X_LABEL_ROOM + TITLE_ROOM);
  }
  if (options.yLabel) {
    ctx.translate(PAD + LABEL_SIZE / 2, plot.y + plot.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textBaseline = 'middle';
    ctx.fillText(options.yLabel, 0, 0);
  }
  ctx.restore();
}
