import type { Bar3DChartOptions, BarHit, Theme } from '@tradecanvas/commons';
import { withAlpha } from '@tradecanvas/commons';
import { CHART_PAD, LABEL_GAP, axisFormat, canvasMeasure, drawLegend, drawTooltip, extent, layoutLegend, niceScale, numberFormat, seriesColor, type LegendLayout, type Measure, type NiceScale } from './chartKit.js';
import { litColor } from './colorScale.js';
import { computeScene3D, drawScene3D, drawSceneLabels, faceLight, inQuad, sceneX, sceneY, type Axis3D, type Scene3D } from './scene3d.js';

/** Categories and series past this many are left out: their columns would be under a few pixels. */
export const MAX_BAR3D_SIZE = 120;
/** The share of its place a column takes, across and back. */
const COLUMN_SHARE = 0.62;
const VALUE_TICKS = 4;
/** How much lighter the column under the pointer is drawn. */
const HOVER_LIGHT = 0.18;
/** How strongly the level of zero is filled, where columns hang under it. */
const ZERO_ALPHA = 0.06;

/** A side of a column: its four corners on the screen, and how strongly it is lit. */
export interface Bar3DFace {
  points: number[];
  light: number;
}

export interface Bar3DBox {
  hit: BarHit;
  color: string;
  /** The side that faces the eye along x, the one along y, and the top. */
  faces: Bar3DFace[];
  /** The middle of its top. */
  top: { x: number; y: number };
}

export interface Bar3DLayout {
  /** The box on the screen; null with nothing to draw. */
  scene: Scene3D | null;
  zScale: NiceScale;
  /**
   * The columns in the order they are drawn: the ones under zero from the
   * back to the front, then the ones over it. Seen from above, all that is
   * under the level of zero is behind it, and all that is over it in front.
   */
  bars: Bar3DBox[];
  /** How many of them are under zero. */
  under: number;
  /** The level of zero, its four corners on the screen, where there are columns under it. */
  zero: number[] | null;
  legend: LegendLayout | null;
}

const NOTHING: Bar3DLayout = { scene: null, zScale: niceScale(0, 1), bars: [], under: 0, zero: null, legend: null };

/** A column for each value, in rows a series deep, for a chart `width` × `height`. */
export function computeBar3DLayout(options: Bar3DChartOptions, width: number, height: number, _theme: Theme, measure: Measure): Bar3DLayout {
  const categories = (options.categories ?? []).slice(0, MAX_BAR3D_SIZE);
  const series = (options.series ?? []).slice(0, MAX_BAR3D_SIZE);
  const n = categories.length;
  const m = series.length;
  const finite: number[] = [];
  for (const one of series) for (let i = 0; i < n; i++) if (Number.isFinite(one.values?.[i])) finite.push(one.values[i]);
  const range = extent(finite);
  if (!range || width <= 0 || height <= 0) return NOTHING;

  // Columns stand on zero: it is on the scale whatever the values are.
  const zScale = niceScale(Math.min(0, range.min), Math.max(0, range.max), VALUE_TICKS);
  const span = zScale.max - zScale.min;
  const up = (value: number) => (value - zScale.min) / span;
  const valueText = options.valueFormat ?? axisFormat(zScale, options.locale);
  const axes = {
    x: { title: options.xLabel, ticks: categories.map((text, i) => ({ at: (i + 0.5) / n, text })) },
    // One series needs no name beside its row.
    y: { title: options.yLabel, ticks: m > 1 ? series.map((one, j) => ({ at: (j + 0.5) / m, text: one.name })) : [] } as Axis3D,
    z: { title: options.valueLabel, ticks: zScale.ticks.map((tick) => ({ at: up(tick), text: valueText(tick) })), zero: up(0) },
  };
  const named = options.legend ?? m > 1;
  const legend = named ? layoutLegend(series.map((one, j) => ({ label: one.name, color: seriesColor(j, one.color) })), width - CHART_PAD * 2, measure) : null;
  const top = CHART_PAD + (legend ? legend.height + LABEL_GAP : 0);
  const scene = computeScene3D({ x: CHART_PAD, y: top, width: Math.max(1, width - CHART_PAD * 2), height: Math.max(1, height - top - CHART_PAD) }, options.view, axes, measure);

  const corner = (u: number, v: number, h: number) => [sceneX(scene, u, v), sceneY(scene, u, v, h)];
  const under: Bar3DBox[] = [];
  const over: Bar3DBox[] = [];
  const halfU = COLUMN_SHARE / (2 * n);
  const halfV = COLUMN_SHARE / (2 * m);
  // The sides seen are the ones away from the back; which way each faces, for the light.
  const towardsU = scene.uBack === 1 ? -1 : 1;
  const towardsV = scene.vBack === 1 ? -1 : 1;
  const lightU = faceLight(scene, towardsU, 0, 0);
  const lightV = faceLight(scene, 0, 0, towardsV);
  for (let rows = 0; rows < m; rows++) {
    const j = scene.vBack === 1 ? m - 1 - rows : rows;
    for (let columns = 0; columns < n; columns++) {
      const i = scene.uBack === 1 ? n - 1 - columns : columns;
      const value = series[j].values?.[i];
      if (!Number.isFinite(value)) continue;
      const u = (i + 0.5) / n;
      const v = (j + 0.5) / m;
      const low = Math.min(up(0), up(value));
      const high = Math.max(up(0), up(value));
      const nearU = u + towardsU * halfU;
      const nearV = v + towardsV * halfV;
      (value < 0 ? under : over).push({
        hit: { category: categories[i], series: series[j].name, value, index: i },
        color: seriesColor(j, series[j].color),
        faces: [
          { points: [...corner(nearU, v - halfV, low), ...corner(nearU, v + halfV, low), ...corner(nearU, v + halfV, high), ...corner(nearU, v - halfV, high)], light: lightU },
          { points: [...corner(u - halfU, nearV, low), ...corner(u + halfU, nearV, low), ...corner(u + halfU, nearV, high), ...corner(u - halfU, nearV, high)], light: lightV },
          { points: [...corner(u - halfU, v - halfV, high), ...corner(u + halfU, v - halfV, high), ...corner(u + halfU, v + halfV, high), ...corner(u - halfU, v + halfV, high)], light: 1 },
        ],
        top: { x: sceneX(scene, u, v), y: sceneY(scene, u, v, high) },
      });
    }
  }
  const level = up(0);
  const zero = under.length > 0 ? [...corner(0, 0, level), ...corner(1, 0, level), ...corner(1, 1, level), ...corner(0, 1, level)] : null;
  return { scene, zScale, bars: [...under, ...over], under: under.length, zero, legend };
}

/** The column under (x, y): the nearest to the eye of those drawn there. */
export function hitBar3D(layout: Bar3DLayout, x: number, y: number): Bar3DBox | null {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  for (let k = layout.bars.length - 1; k >= 0; k--) {
    const bar = layout.bars[k];
    for (const { points: p } of bar.faces) {
      if (inQuad(x, y, p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7])) return bar;
    }
  }
  return null;
}

/** The level of zero as a sheet across the box: the columns over it stand on it, the ones under it hang from it. */
function drawZero(ctx: CanvasRenderingContext2D, zero: readonly number[], theme: Theme, trace: (points: readonly number[]) => void): void {
  ctx.fillStyle = withAlpha(theme.text, ZERO_ALPHA);
  ctx.strokeStyle = theme.textSecondary;
  trace(zero);
  ctx.fill();
  ctx.stroke();
}

export function renderBar3D(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: Bar3DChartOptions,
  theme: Theme,
  pointer: { x: number; y: number } | null,
  layout: Bar3DLayout = computeBar3DLayout(options, width, height, theme, canvasMeasure(ctx, theme)),
): Bar3DLayout {
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, width, height);
  const { scene } = layout;
  if (!scene) return layout;

  drawScene3D(ctx, scene, theme);
  const hovered = pointer && options.crosshair !== false ? hitBar3D(layout, pointer.x, pointer.y) : null;
  ctx.save();
  ctx.lineWidth = 1;
  ctx.lineJoin = 'round';
  const trace = (points: readonly number[]) => {
    ctx.beginPath();
    ctx.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
    ctx.closePath();
  };
  layout.bars.forEach((bar, k) => {
    if (k === layout.under && layout.zero) drawZero(ctx, layout.zero, theme, trace);
    const lift = bar === hovered ? HOVER_LIGHT : 0;
    for (const face of bar.faces) {
      const light = face.light + lift;
      const fill = litColor(bar.color, light);
      ctx.fillStyle = fill;
      // Its own colour round it: two sides that meet leave a hair of the ground between them.
      ctx.strokeStyle = fill;
      trace(face.points);
      ctx.fill();
      ctx.stroke();
      if (fill === bar.color && light !== 1) {
        // A colour that cannot be read takes no light: its shade is drawn over it.
        ctx.fillStyle = light < 1 ? `rgba(0,0,0,${(1 - light).toFixed(3)})` : `rgba(255,255,255,${Math.min(1, light - 1).toFixed(3)})`;
        ctx.fill();
      }
    }
  });
  // Every column is under zero: the level goes over them all.
  if (layout.zero && layout.under === layout.bars.length) drawZero(ctx, layout.zero, theme, trace);
  ctx.restore();
  drawSceneLabels(ctx, scene, theme);
  if (layout.legend) drawLegend(ctx, layout.legend, CHART_PAD, CHART_PAD, theme);

  if (hovered && pointer) {
    const format = options.valueFormat ?? numberFormat(options.locale);
    drawTooltip(ctx, [
      { text: hovered.hit.category, bold: true },
      { text: `${hovered.hit.series}: ${format(hovered.hit.value)}`, color: hovered.color },
    ], pointer, { x: 0, y: 0, width, height }, theme);
  }
  return layout;
}
