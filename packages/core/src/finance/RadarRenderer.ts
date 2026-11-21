import type { RadarChartOptions, Theme } from '@tradecanvas/commons';
import { withAlpha } from '@tradecanvas/commons';
import {
  CHART_PAD,
  LABEL_GAP,
  LABEL_SIZE,
  canvasMeasure,
  drawLegend,
  drawTooltip,
  extent,
  fitText,
  fontOf,
  layoutLegend,
  numberFormat,
  seriesColor,
  type LegendLayout,
  type Measure,
  type TooltipLine,
} from './chartKit.js';

const TOP = -Math.PI / 2;
const FULL = Math.PI * 2;
/** A shape needs three spokes to have an area. */
const MIN_SPOKES = 3;
const DEFAULT_RINGS = 4;
const MAX_RINGS = 10;
/** A spoke's label takes no more of the chart's width than this share, each side. */
const LABEL_SHARE = 0.22;
const SHAPE_FILL_ALPHA = 0.18;
const DOT_RADIUS = 2.5;
/** The pointer reads a spoke at least this far past the rim, px, and as far as its label goes. */
const HIT_MARGIN = 28;
/** How far off the vertical or the horizontal a spoke is before its label is set to a side. */
const SIDE = 0.3;

export interface RadarSpoke {
  label: string;
  angle: number;
  /** The values at the centre and at the rim. */
  min: number;
  max: number;
  /** Where the spoke meets the rim. */
  x: number;
  y: number;
}

export interface RadarShapePoint {
  x: number;
  y: number;
  /** The series' value on this spoke; null when it has none. */
  value: number | null;
  /** How far out it is, from 0 at the centre to 1 at the rim. */
  share: number;
}

export interface RadarShape {
  name: string;
  color: string;
  points: RadarShapePoint[];
}

export interface RadarLayout {
  cx: number;
  cy: number;
  radius: number;
  rings: number;
  spokes: RadarSpoke[];
  shapes: RadarShape[];
  /** The room a spoke's label has, px. */
  labelWidth: number;
  legend: LegendLayout | null;
}

const finite = (value: number | undefined): value is number => typeof value === 'number' && Number.isFinite(value);

/** The spokes and each series' shape on them, for a chart `width` × `height`. Fewer than three spokes: none. */
export function computeRadarLayout(options: RadarChartOptions, width: number, height: number, _theme: Theme, measure: Measure): RadarLayout {
  const { axes, series } = options;
  const asked = options.rings;
  const rings = finite(asked) && asked >= 1 ? Math.min(MAX_RINGS, Math.floor(asked)) : DEFAULT_RINGS;
  const showLegend = options.legend ?? series.length > 1;
  const legend = showLegend && series.length > 0 && axes.length >= MIN_SPOKES
    ? layoutLegend(series.map((s, i) => ({ label: s.name, color: seriesColor(i, s.color) })), width - CHART_PAD * 2, measure)
    : null;
  const areaHeight = height - CHART_PAD * 2 - (legend ? legend.height + LABEL_GAP : 0);
  const cx = width / 2;
  const cy = CHART_PAD + areaHeight / 2;
  if (axes.length < MIN_SPOKES) return { cx, cy, radius: 0, rings, spokes: [], shapes: [], labelWidth: 0, legend: null };

  const labelWidth = Math.min(width * LABEL_SHARE, extent(axes.map((axis) => measure(axis.label, LABEL_SIZE)))?.max ?? 0);
  const radius = Math.max(0, Math.min(width / 2 - CHART_PAD - labelWidth - LABEL_GAP, areaHeight / 2 - LABEL_SIZE - LABEL_GAP));
  const spokes = axes.map((axis, i): RadarSpoke => {
    const angle = TOP + (i * FULL) / axes.length;
    const here = extent(series.map((s) => s.values[i]).filter(finite));
    // The centre: the value given, else zero, or the lowest value here when that is under zero.
    const low = finite(axis.min) ? axis.min : Math.min(0, here?.min ?? 0);
    // The rim: the value given, else the highest any series has here.
    const high = finite(axis.max) ? axis.max : Math.max(low, here?.max ?? low);
    // A rim given under its centre is taken the other way round.
    return { label: axis.label, angle, min: Math.min(low, high), max: Math.max(low, high), x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
  });
  const shapes = series.map((s, i): RadarShape => ({
    name: s.name,
    color: seriesColor(i, s.color),
    points: spokes.map((spoke, k) => {
      const value = finite(s.values[k]) ? s.values[k] : null;
      const share = value !== null && spoke.max > spoke.min ? Math.min(1, Math.max(0, (value - spoke.min) / (spoke.max - spoke.min))) : 0;
      return { x: cx + Math.cos(spoke.angle) * radius * share, y: cy + Math.sin(spoke.angle) * radius * share, value, share };
    }),
  }));
  return { cx, cy, radius, rings, spokes, shapes, labelWidth, legend };
}

/** The spoke nearest the pointer by its angle, inside the chart and a little past the rim; its index. */
export function hitRadarAxis(layout: RadarLayout, x: number, y: number): number | null {
  const { cx, cy, radius, spokes } = layout;
  if (spokes.length === 0 || Math.hypot(x - cx, y - cy) > radius + Math.max(HIT_MARGIN, layout.labelWidth + LABEL_GAP)) return null;
  const angle = Math.atan2(y - cy, x - cx);
  let best = 0;
  let nearest = Infinity;
  spokes.forEach((spoke, i) => {
    const apart = Math.abs(((angle - spoke.angle + Math.PI * 3) % FULL) - Math.PI);
    if (apart < nearest) {
      nearest = apart;
      best = i;
    }
  });
  return best;
}

function drawGrid(ctx: CanvasRenderingContext2D, layout: RadarLayout, theme: Theme, hovered: number | null): void {
  const { cx, cy, radius, rings, spokes } = layout;
  ctx.strokeStyle = theme.grid;
  ctx.lineWidth = 1;
  for (let ring = 1; ring <= rings; ring++) {
    const r = (radius * ring) / rings;
    ctx.beginPath();
    spokes.forEach((spoke, i) => {
      const x = cx + Math.cos(spoke.angle) * r;
      const y = cy + Math.sin(spoke.angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();
  }
  spokes.forEach((spoke, i) => {
    ctx.strokeStyle = i === hovered ? theme.crosshair : theme.grid;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(spoke.x, spoke.y);
    ctx.stroke();
  });
}

function drawLabels(ctx: CanvasRenderingContext2D, layout: RadarLayout, theme: Theme, measure: Measure): void {
  ctx.font = fontOf(theme, LABEL_SIZE);
  ctx.fillStyle = theme.axisLabel;
  for (const spoke of layout.spokes) {
    const across = Math.cos(spoke.angle);
    const down = Math.sin(spoke.angle);
    const centred = Math.abs(across) <= SIDE;
    ctx.textAlign = centred ? 'center' : across > 0 ? 'left' : 'right';
    ctx.textBaseline = down < -SIDE ? 'bottom' : down > SIDE ? 'top' : 'middle';
    // Over or under the chart a label has the chart's own width; beside it, the room kept at the side.
    const text = fitText(spoke.label, centred ? Math.max(layout.labelWidth, layout.radius * 2) : layout.labelWidth, measure);
    if (text) ctx.fillText(text, Math.round(spoke.x + across * LABEL_GAP), Math.round(spoke.y + down * LABEL_GAP));
  }
}

export function renderRadar(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: RadarChartOptions,
  theme: Theme,
  pointer: { x: number; y: number } | null,
  layout: RadarLayout = computeRadarLayout(options, width, height, theme, canvasMeasure(ctx, theme)),
): RadarLayout {
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, width, height);
  if (layout.spokes.length === 0) return layout;

  const format = options.valueFormat ?? numberFormat(options.locale);
  const hovered = pointer && options.crosshair !== false ? hitRadarAxis(layout, pointer.x, pointer.y) : null;
  ctx.save();
  drawGrid(ctx, layout, theme, hovered);
  drawLabels(ctx, layout, theme, canvasMeasure(ctx, theme));
  for (const shape of layout.shapes) {
    ctx.beginPath();
    shape.points.forEach((point, i) => (i === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)));
    ctx.closePath();
    if (options.fill !== false) {
      ctx.fillStyle = withAlpha(shape.color, SHAPE_FILL_ALPHA);
      ctx.fill();
    }
    ctx.strokeStyle = shape.color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.fillStyle = shape.color;
    shape.points.forEach((point, i) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, i === hovered ? DOT_RADIUS + 1.5 : DOT_RADIUS, 0, FULL);
      ctx.fill();
    });
  }
  ctx.restore();
  if (layout.legend) drawLegend(ctx, layout.legend, CHART_PAD, height - CHART_PAD - layout.legend.height, theme);

  if (hovered !== null && pointer) {
    const rows: TooltipLine[] = [{ text: layout.spokes[hovered].label, bold: true }];
    for (const shape of layout.shapes) {
      const { value } = shape.points[hovered];
      if (value !== null) rows.push({ text: `${shape.name}: ${format(value)}`, color: shape.color });
    }
    drawTooltip(ctx, rows, pointer, { x: 0, y: 0, width, height }, theme);
  }
  return layout;
}
