import type { HistogramBin, HistogramOptions, Theme } from '@tradecanvas/commons';
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

/** Rounding slack, so a value on a bin edge lands in the bin it starts. */
const EPSILON = 1e-9;
/** No more bins than this, whatever the options ask: more can't be seen, and could run out of memory. */
export const MAX_BINS = 1000;

const tidy = (value: number) => {
  const v = Number(value.toPrecision(12));
  return v === 0 ? 0 : v;
};

/**
 * Values counted into equal bins: `bins` of them over the values' range, a
 * `binWidth` on a grid from 0, or Sturges' count (`ceil(log2 n) + 1`).
 * Each bin holds `from` up to `to`; the last one holds `to` too.
 */
export function histogramBins(values: readonly number[], options: { bins?: number | 'auto'; binWidth?: number } = {}): HistogramBin[] {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return [];
  let min = Infinity;
  let max = -Infinity;
  for (const v of finite) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (min === max) return [{ from: min, to: max, count: finite.length }];

  const width = options.binWidth;
  if (width !== undefined && width > 0 && Number.isFinite(width)) {
    const first = Math.floor(min / width + EPSILON);
    // The top value on an edge closes the bin below it, as in the other mode.
    const last = Math.max(first, Math.ceil(max / width - EPSILON) - 1);
    const length = last - first + 1;
    if (length <= MAX_BINS) {
      const bins = Array.from({ length }, (_, i) => ({
        from: tidy((first + i) * width),
        to: tidy((first + i + 1) * width),
        count: 0,
      }));
      for (const v of finite) bins[Math.min(length - 1, Math.floor(v / width + EPSILON) - first)].count++;
      return bins;
    }
  }

  const asked = options.bins;
  const count = typeof asked === 'number' && Number.isFinite(asked) && asked >= 1
    ? Math.min(MAX_BINS, Math.floor(asked))
    : Math.min(MAX_BINS, Math.ceil(Math.log2(finite.length)) + 1);
  const step = (max - min) / count;
  const bins = Array.from({ length: count }, (_, i) => ({
    from: tidy(min + i * step),
    to: tidy(i === count - 1 ? max : min + (i + 1) * step),
    count: 0,
  }));
  for (const v of finite) bins[Math.min(count - 1, Math.floor((v - min) / step + EPSILON))].count++;
  return bins;
}

export interface HistogramBar {
  x: number;
  y: number;
  width: number;
  height: number;
  bin: HistogramBin;
  color: string;
}

export interface HistogramLayout {
  plot: Rect;
  xScale: NiceScale;
  yScale: NiceScale;
  bars: HistogramBar[];
  total: number;
}

const PAD = 12;
const X_LABEL_ROOM = 20;
const MARKER_ROOM = 16;

function binColor(bin: HistogramBin, options: HistogramOptions, theme: Theme): string {
  if (!options.colorBySign) return options.color ?? TC_SERIES_COLORS[0];
  return (bin.from + bin.to) / 2 < 0 ? theme.candleDown : theme.candleUp;
}

/** The bins' bars on a value axis, for a chart `width` × `height`. */
export function computeHistogramLayout(options: HistogramOptions, width: number, height: number, theme: Theme, measure: Measure): HistogramLayout {
  const bins = histogramBins(options.values, { bins: options.bins, binWidth: options.binWidth });
  const lo = bins.length > 0 ? bins[0].from : 0;
  const hi = bins.length > 0 ? bins[bins.length - 1].to : 1;
  const markerValues = (options.markers ?? []).map((m) => m.value).filter((v) => Number.isFinite(v));
  const xScale = niceScale(Math.min(lo, ...markerValues), Math.max(hi, ...markerValues), Math.max(2, Math.floor(width / 110)));
  let most = 0;
  for (const b of bins) if (b.count > most) most = b.count;
  // Counts in whole steps: at least 4 on the axis.
  const yScale = niceScale(0, Math.max(4, most), 4);
  const format = options.valueFormat ?? axisFormat(xScale);
  const tickWidth = Math.max(0, ...yScale.ticks.map((t) => measure(axisFormat(yScale)(t), LABEL_SIZE)));
  const top = PAD + (markerValues.length > 0 ? MARKER_ROOM : 0);
  const left = PAD + tickWidth + 8;
  const right = PAD + measure(format(xScale.max), LABEL_SIZE) / 2;
  const plot = { x: left, y: top, width: Math.max(1, width - left - right), height: Math.max(1, height - top - PAD - X_LABEL_ROOM) };

  const bars = bins.map((bin) => {
    const x0 = scaleToPx(xScale, bin.from, plot.x, plot.width);
    // A one-value histogram: a bar a tenth of the plot wide.
    const x1 = bin.to > bin.from ? scaleToPx(xScale, bin.to, plot.x, plot.width) : x0 + plot.width / 10;
    const y = scaleToPx(yScale, bin.count, plot.y, plot.height, true);
    return { x: x0, y, width: Math.max(1, x1 - x0), height: plot.y + plot.height - y, bin, color: binColor(bin, options, theme) };
  });
  return { plot, xScale, yScale, bars, total: bins.reduce((sum, b) => sum + b.count, 0) };
}

/** The bar whose bin holds the pointer's x, inside the plot. */
export function hitHistogramBar(layout: HistogramLayout, x: number, y: number): HistogramBar | null {
  const { plot } = layout;
  if (y < plot.y || y > plot.y + plot.height) return null;
  return layout.bars.find((b) => x >= b.x && x < b.x + b.width) ?? null;
}

const share = new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 1 });

export function renderHistogram(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: HistogramOptions,
  theme: Theme,
  pointer: { x: number; y: number } | null,
  layout: HistogramLayout = computeHistogramLayout(options, width, height, theme, canvasMeasure(ctx, theme)),
): HistogramLayout {
  const format = options.valueFormat ?? defaultFormat;
  const { plot } = layout;

  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, width, height);
  drawValueAxis(ctx, plot, layout.yScale, 'vertical', theme, axisFormat(layout.yScale));
  drawValueAxis(ctx, plot, layout.xScale, 'horizontal', theme, options.valueFormat ?? axisFormat(layout.xScale));

  const hovered = pointer && options.crosshair !== false ? hitHistogramBar(layout, pointer.x, pointer.y) : null;
  for (const bar of layout.bars) {
    ctx.fillStyle = bar === hovered ? bar.color : withAlpha(bar.color, 0.75);
    // One pixel between neighbours, when they are wide enough to spare it.
    ctx.fillRect(bar.x + (bar.width > 3 ? 0.5 : 0), bar.y, Math.max(1, bar.width - (bar.width > 3 ? 1 : 0)), bar.height);
  }

  drawMarkers(ctx, layout, options, theme, format);

  if (hovered && pointer) {
    const { bin } = hovered;
    drawTooltip(ctx, [
      { text: bin.to > bin.from ? `${format(bin.from)} – ${format(bin.to)}` : format(bin.from), bold: true, color: hovered.color },
      { text: `${defaultFormat(bin.count)} · ${share.format(layout.total > 0 ? bin.count / layout.total : 0)}` },
    ], pointer, { x: 0, y: 0, width, height }, theme);
  }
  return layout;
}

function drawMarkers(ctx: CanvasRenderingContext2D, layout: HistogramLayout, options: HistogramOptions, theme: Theme, format: (v: number) => string): void {
  const { plot } = layout;
  ctx.save();
  ctx.font = fontOf(theme, LABEL_SIZE - 1);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  // Labels that would overlap one already drawn go a row lower, inside the plot.
  const taken: { from: number; to: number; row: number }[] = [];
  for (const marker of options.markers ?? []) {
    if (!Number.isFinite(marker.value)) continue;
    const x = Math.round(scaleToPx(layout.xScale, marker.value, plot.x, plot.width)) + 0.5;
    const color = marker.color ?? theme.text;
    ctx.strokeStyle = color;
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, plot.y);
    ctx.lineTo(x, plot.y + plot.height);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = color;
    const text = marker.label ? `${marker.label} ${format(marker.value)}` : format(marker.value);
    const half = ctx.measureText(text).width / 2 + 4;
    let row = 0;
    while (taken.some((t) => t.row === row && x - half < t.to && x + half > t.from)) row++;
    taken.push({ from: x - half, to: x + half, row });
    ctx.fillText(text, x, plot.y - 3 + row * (LABEL_SIZE + 3));
  }
  ctx.restore();
}
