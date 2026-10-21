import type { DonutChartOptions, DonutSlice, Theme } from '@tradecanvas/commons';
import {
  LABEL_SIZE,
  canvasMeasure,
  defaultFormat,
  drawLegend,
  drawTooltip,
  fitText,
  fontOf,
  layoutLegend,
  seriesColor,
  type LegendLayout,
  type Measure,
} from './chartKit.js';

export interface SliceArc {
  label: string;
  value: number;
  /** Its part of the whole, 0–1. */
  share: number;
  /** Angles in radians, clockwise from three o'clock; the first starts at twelve. */
  start: number;
  end: number;
  color: string;
  slice: DonutSlice;
}

export interface DonutLayout {
  cx: number;
  cy: number;
  radius: number;
  inner: number;
  total: number;
  slices: SliceArc[];
  legend: LegendLayout | null;
  legendX: number;
  legendY: number;
}

const PAD = 12;
const TOP = -Math.PI / 2;
const FULL = Math.PI * 2;
/** How far a hovered slice moves out, px. */
const POP = 5;
/** A legend goes beside the ring when the chart is this much wider than tall. */
const SIDE_LEGEND_RATIO = 1.4;
/** A legend row's height (chartKit's), for whether a column of them fits. */
const LEGEND_ROW_HEIGHT = 18;

const percent = new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 1 });

/** The ring and its slices, for a chart `width` × `height`. */
export function computeDonutLayout(options: DonutChartOptions, width: number, height: number, _theme: Theme, measure: Measure): DonutLayout {
  const kept = options.data.filter((s) => Number.isFinite(s.value) && s.value > 0);
  const total = kept.reduce((sum, s) => sum + s.value, 0);
  const items = kept.map((s, i) => ({ label: `${s.label} ${percent.format(s.value / total)}`, color: seriesColor(i, s.color) }));
  const showLegend = options.legend !== false && kept.length > 0;
  // Beside the ring when the chart is wide and the list fits its height; else under it.
  const side = showLegend && width >= height * SIDE_LEGEND_RATIO && kept.length * LEGEND_ROW_HEIGHT <= height - PAD * 2;
  const legendWidth = side ? Math.min(width * 0.4, Math.max(...items.map((it) => measure(it.label, LABEL_SIZE))) + 16) : width - PAD * 2;
  // Beside the ring: one entry a row.
  const legend = showLegend ? layoutLegend(items, legendWidth, measure, side) : null;
  const areaW = side ? width - legendWidth - PAD * 3 : width - PAD * 2;
  const areaH = side ? height - PAD * 2 : height - PAD * 3 - (legend?.height ?? 0);
  const radius = Math.max(0, Math.min(areaW, areaH) / 2 - POP);
  const cx = PAD + areaW / 2;
  const cy = PAD + areaH / 2;
  const asked = options.innerRadius;
  const hole = Math.min(0.95, Math.max(0, asked !== undefined && Number.isFinite(asked) ? asked : 0.6));

  let angle = TOP;
  const slices: SliceArc[] = kept.map((slice, i) => {
    const share = slice.value / total;
    const start = angle;
    angle += share * FULL;
    return { label: slice.label, value: slice.value, share, start, end: angle, color: seriesColor(i, slice.color), slice };
  });

  return {
    cx,
    cy,
    radius,
    inner: radius * hole,
    total,
    slices,
    legend,
    legendX: side ? width - legendWidth - PAD : PAD,
    legendY: side ? Math.max(PAD, cy - (legend?.height ?? 0) / 2) : PAD * 2 + areaH,
  };
}

/** The slice under (x, y): on the ring, not in the hole or outside. */
export function hitSlice(layout: DonutLayout, x: number, y: number): SliceArc | null {
  const dx = x - layout.cx;
  const dy = y - layout.cy;
  const dist = Math.hypot(dx, dy);
  if (dist < layout.inner || dist > layout.radius + POP) return null;
  let a = Math.atan2(dy, dx);
  while (a < TOP) a += FULL;
  return layout.slices.find((s) => a >= s.start && a < s.end) ?? null;
}

export function renderDonut(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: DonutChartOptions,
  theme: Theme,
  pointer: { x: number; y: number } | null,
  layout: DonutLayout = computeDonutLayout(options, width, height, theme, canvasMeasure(ctx, theme)),
): DonutLayout {
  const measure = canvasMeasure(ctx, theme);
  const format = options.valueFormat ?? defaultFormat;
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, width, height);

  const hovered = pointer && options.crosshair !== false ? hitSlice(layout, pointer.x, pointer.y) : null;
  const { cx, cy, radius, inner } = layout;
  for (const s of layout.slices) {
    const mid = (s.start + s.end) / 2;
    const pop = s === hovered ? POP : 0;
    const ox = cx + Math.cos(mid) * pop;
    const oy = cy + Math.sin(mid) * pop;
    ctx.beginPath();
    ctx.arc(ox, oy, radius, s.start, s.end);
    if (inner > 0) ctx.arc(ox, oy, inner, s.end, s.start, true);
    else ctx.lineTo(ox, oy);
    ctx.closePath();
    ctx.fillStyle = s.color;
    ctx.fill();
    // A thin gap between slices, in the background colour.
    if (layout.slices.length > 1) {
      ctx.strokeStyle = theme.background;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  if (options.showLabels !== false) drawShares(ctx, layout, theme);
  drawCenter(ctx, layout, options, theme, measure);
  if (layout.legend) drawLegend(ctx, layout.legend, layout.legendX, layout.legendY, theme);

  if (hovered && pointer) {
    drawTooltip(ctx, [
      { text: hovered.label, bold: true, color: hovered.color },
      { text: `${format(hovered.value)} · ${percent.format(hovered.share)}` },
    ], pointer, { x: 0, y: 0, width, height }, theme);
  }
  return layout;
}

/** Each slice's share on it, where the arc has room. */
function drawShares(ctx: CanvasRenderingContext2D, layout: DonutLayout, theme: Theme): void {
  const { cx, cy, radius, inner } = layout;
  const at = inner > 0 ? (radius + inner) / 2 : radius * 0.62;
  ctx.save();
  ctx.font = fontOf(theme, LABEL_SIZE, '600');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  for (const s of layout.slices) {
    const text = percent.format(s.share);
    const arc = (s.end - s.start) * at;
    if (arc < ctx.measureText(text).width + 8 || (inner > 0 && radius - inner < LABEL_SIZE + 4)) continue;
    const mid = (s.start + s.end) / 2;
    ctx.fillText(text, cx + Math.cos(mid) * at, cy + Math.sin(mid) * at);
  }
  ctx.restore();
}

function drawCenter(ctx: CanvasRenderingContext2D, layout: DonutLayout, options: DonutChartOptions, theme: Theme, measure: Measure): void {
  if (layout.inner <= 0 || (!options.centerLabel && !options.centerValue)) return;
  const room = layout.inner * 1.6;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (options.centerValue) {
    const size = Math.max(12, Math.min(28, layout.inner * 0.42));
    ctx.font = fontOf(theme, size, '600');
    ctx.fillStyle = theme.text;
    ctx.fillText(fitText(options.centerValue, room, measure, size), layout.cx, layout.cy + (options.centerLabel ? size * 0.35 : 0));
  }
  if (options.centerLabel) {
    ctx.font = fontOf(theme, LABEL_SIZE);
    ctx.fillStyle = theme.textSecondary;
    ctx.fillText(fitText(options.centerLabel, room, measure), layout.cx, layout.cy - (options.centerValue ? LABEL_SIZE * 1.1 : 0));
  }
  ctx.restore();
}
