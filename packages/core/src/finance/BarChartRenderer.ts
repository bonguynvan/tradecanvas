import type { BarChartOptions, Theme } from '@tradecanvas/commons';
import { withAlpha } from '@tradecanvas/commons';
import {
  LABEL_SIZE,
  axisFormat,
  canvasMeasure,
  defaultFormat,
  drawLegend,
  drawTooltip,
  drawValueAxis,
  fitText,
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

export interface BarRect {
  x: number;
  y: number;
  width: number;
  height: number;
  category: string;
  series: string;
  value: number;
  /** The category's index. */
  index: number;
  color: string;
}

export interface BarLayout {
  plot: Rect;
  scale: NiceScale;
  orientation: 'vertical' | 'horizontal';
  /** The zero line: a y for vertical bars, an x for horizontal ones. */
  zero: number;
  /** Bars series by series, each in category order. */
  bars: BarRect[];
  /** Where each category's band starts along the category axis, and how long it is. */
  bandStart: number;
  band: number;
  legend: LegendLayout | null;
  legendY: number;
}

const PAD = 12;
/** Share of a category's band the bars take. */
const GROUP_SHARE = 0.72;
const CATEGORY_LABEL_HEIGHT = 20;
/** Horizontal bars: category labels take at most this share of the width. */
const MAX_LABEL_SHARE = 0.35;

/** The value scale's range: zero always in it; stacked bars by their sums. */
function valueRange(options: BarChartOptions): [number, number] {
  let lo = 0;
  let hi = 0;
  const stacked = options.mode === 'stacked';
  options.categories.forEach((_, i) => {
    let up = 0;
    let down = 0;
    for (const s of options.series) {
      const v = s.values[i];
      if (!Number.isFinite(v)) continue;
      if (stacked) {
        if (v >= 0) up += v;
        else down += v;
      } else {
        hi = Math.max(hi, v);
        lo = Math.min(lo, v);
      }
    }
    hi = Math.max(hi, up);
    lo = Math.min(lo, down);
  });
  return [lo, hi];
}

function signColors(options: BarChartOptions, theme: Theme): { positive: string; negative: string } | null {
  const sign = options.colorBySign;
  if (!sign) return null;
  return sign === true ? { positive: theme.candleUp, negative: theme.candleDown } : sign;
}

/** Where the bars go, for a chart `width` × `height`. */
export function computeBarLayout(options: BarChartOptions, width: number, height: number, theme: Theme, measure: Measure): BarLayout {
  const horizontal = options.orientation === 'horizontal';
  const showLegend = options.legend ?? options.series.length > 1;
  const legend = showLegend
    ? layoutLegend(options.series.map((s, i) => ({ label: s.name, color: seriesColor(i, s.color) })), width - PAD * 2, measure)
    : null;
  const top = PAD + (legend ? legend.height + 6 : 0);
  const [lo, hi] = valueRange(options);
  const scale = niceScale(lo, hi, horizontal ? Math.max(2, Math.floor(width / 110)) : 5);
  const format = options.valueFormat ?? axisFormat(scale);
  const tickWidth = Math.max(0, ...scale.ticks.map((t) => measure(format(t), LABEL_SIZE)));

  let plot: Rect;
  if (horizontal) {
    const labelWidth = Math.min(width * MAX_LABEL_SHARE, Math.max(0, ...options.categories.map((c) => measure(c, LABEL_SIZE))));
    const left = PAD + labelWidth + 8;
    plot = { x: left, y: top, width: Math.max(1, width - left - PAD - tickWidth / 2), height: Math.max(1, height - top - PAD - CATEGORY_LABEL_HEIGHT) };
  } else {
    const left = PAD + tickWidth + 8;
    plot = { x: left, y: top, width: Math.max(1, width - left - PAD), height: Math.max(1, height - top - PAD - CATEGORY_LABEL_HEIGHT) };
  }

  const count = Math.max(1, options.categories.length);
  const bandStart = horizontal ? plot.y : plot.x;
  const band = (horizontal ? plot.height : plot.width) / count;
  const group = band * GROUP_SHARE;
  const stacked = options.mode === 'stacked';
  const thickness = stacked ? group : group / Math.max(1, options.series.length);
  const valuePx = (v: number) => (horizontal ? scaleToPx(scale, v, plot.x, plot.width) : scaleToPx(scale, v, plot.y, plot.height, true));
  const zero = valuePx(0);
  const signs = signColors(options, theme);

  const ups = new Array<number>(count).fill(0);
  const downs = new Array<number>(count).fill(0);
  const bars: BarRect[] = [];
  options.series.forEach((s, si) => {
    options.categories.forEach((category, i) => {
      const value = s.values[i];
      if (!Number.isFinite(value)) return;
      let from = 0;
      if (stacked) {
        from = value >= 0 ? ups[i] : downs[i];
        if (value >= 0) ups[i] += value;
        else downs[i] += value;
      }
      const a = valuePx(from);
      const b = valuePx(from + value);
      const across = bandStart + i * band + (band - group) / 2 + (stacked ? 0 : si * thickness);
      const color = signs ? (value >= 0 ? signs.positive : signs.negative) : seriesColor(si, s.color);
      const lo2 = Math.min(a, b);
      const len = Math.abs(b - a);
      bars.push(horizontal
        ? { x: lo2, y: across, width: len, height: thickness, category, series: s.name, value, index: i, color }
        : { x: across, y: lo2, width: thickness, height: len, category, series: s.name, value, index: i, color });
    });
  });

  return { plot, scale, orientation: horizontal ? 'horizontal' : 'vertical', zero, bars, bandStart, band, legend, legendY: PAD };
}

/** The bar under (x, y); a bar at least a few pixels thick, so a thin one can be found. */
export function hitBar(layout: BarLayout, x: number, y: number): BarRect | null {
  const slack = 2;
  for (const bar of layout.bars) {
    if (x >= bar.x - slack && x <= bar.x + bar.width + slack && y >= bar.y - slack && y <= bar.y + bar.height + slack) return bar;
  }
  return null;
}

/** The category whose band holds (x, y) inside the plot; -1 outside it. */
export function hitCategory(layout: BarLayout, x: number, y: number, count: number): number {
  const { plot } = layout;
  if (x < plot.x || x > plot.x + plot.width || y < plot.y || y > plot.y + plot.height) return -1;
  const along = layout.orientation === 'horizontal' ? y : x;
  const i = Math.floor((along - layout.bandStart) / layout.band);
  return i >= 0 && i < count ? i : -1;
}

export function renderBarChart(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: BarChartOptions,
  theme: Theme,
  pointer: { x: number; y: number } | null,
  layout: BarLayout = computeBarLayout(options, width, height, theme, canvasMeasure(ctx, theme)),
): BarLayout {
  const measure = canvasMeasure(ctx, theme);
  const format = options.valueFormat ?? defaultFormat;
  const { plot, orientation } = layout;
  const horizontal = orientation === 'horizontal';

  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, width, height);
  if (layout.legend) drawLegend(ctx, layout.legend, PAD, layout.legendY, theme);
  drawValueAxis(ctx, plot, layout.scale, horizontal ? 'horizontal' : 'vertical', theme, options.valueFormat ?? axisFormat(layout.scale));

  const hovered = pointer && options.crosshair !== false ? hitCategory(layout, pointer.x, pointer.y, options.categories.length) : -1;
  if (hovered >= 0) {
    ctx.fillStyle = withAlpha(theme.crosshair, 0.08);
    const start = layout.bandStart + hovered * layout.band;
    if (horizontal) ctx.fillRect(plot.x, start, plot.width, layout.band);
    else ctx.fillRect(start, plot.y, layout.band, plot.height);
  }

  for (const bar of layout.bars) {
    ctx.fillStyle = bar.color;
    ctx.fillRect(bar.x, bar.y, Math.max(bar.width, horizontal ? 1 : 0), Math.max(bar.height, horizontal ? 0 : 1));
  }

  // The zero line over the bars' feet.
  ctx.strokeStyle = theme.axisLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  const z = Math.round(layout.zero) + 0.5;
  if (horizontal) {
    ctx.moveTo(z, plot.y);
    ctx.lineTo(z, plot.y + plot.height);
  } else {
    ctx.moveTo(plot.x, z);
    ctx.lineTo(plot.x + plot.width, z);
  }
  ctx.stroke();

  drawCategoryLabels(ctx, options.categories, layout, theme, measure);
  if (options.showValues) drawBarValues(ctx, layout, theme, format, options.mode === 'stacked');

  if (hovered >= 0 && pointer) {
    const lines: TooltipLine[] = [{ text: options.categories[hovered], bold: true }];
    for (const bar of layout.bars) {
      if (bar.index === hovered) lines.push({ text: `${bar.series}: ${format(bar.value)}`, color: bar.color });
    }
    drawTooltip(ctx, lines, pointer, { x: 0, y: 0, width, height }, theme);
  }
  return layout;
}

function drawCategoryLabels(ctx: CanvasRenderingContext2D, categories: readonly string[], layout: BarLayout, theme: Theme, measure: Measure): void {
  const { plot } = layout;
  ctx.save();
  ctx.font = fontOf(theme, LABEL_SIZE);
  ctx.fillStyle = theme.axisLabel;
  // Too many to fit along the bottom: every few, in full, rather than all cut short.
  const widest = Math.max(0, ...categories.map((c) => measure(c, LABEL_SIZE)));
  const every = layout.orientation === 'vertical' ? Math.max(1, Math.ceil((widest + 8) / Math.max(1, layout.band))) : 1;
  categories.forEach((label, i) => {
    if (i % every !== 0) return;
    const center = layout.bandStart + (i + 0.5) * layout.band;
    if (layout.orientation === 'horizontal') {
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(fitText(label, plot.x - PAD - 8, measure), plot.x - 8, center);
    } else {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(fitText(label, layout.band * every - 4, measure), center, plot.y + plot.height + 6);
    }
  });
  ctx.restore();
}

function drawBarValues(ctx: CanvasRenderingContext2D, layout: BarLayout, theme: Theme, format: (v: number) => string, stacked: boolean): void {
  ctx.save();
  ctx.font = fontOf(theme, LABEL_SIZE - 1);
  ctx.fillStyle = theme.textSecondary;
  for (const bar of layout.bars) {
    const text = format(bar.value);
    if (layout.orientation === 'horizontal') {
      ctx.textBaseline = 'middle';
      const cy = bar.y + bar.height / 2;
      if (stacked) {
        ctx.textAlign = 'center';
        if (ctx.measureText(text).width < bar.width - 4) ctx.fillText(text, bar.x + bar.width / 2, cy);
      } else if (bar.value >= 0) {
        ctx.textAlign = 'left';
        ctx.fillText(text, bar.x + bar.width + 4, cy);
      } else {
        ctx.textAlign = 'right';
        ctx.fillText(text, bar.x - 4, cy);
      }
    } else {
      ctx.textAlign = 'center';
      const cx = bar.x + bar.width / 2;
      if (stacked) {
        ctx.textBaseline = 'middle';
        if (bar.height > LABEL_SIZE + 2 && ctx.measureText(text).width < bar.width) ctx.fillText(text, cx, bar.y + bar.height / 2);
      } else if (bar.value >= 0) {
        ctx.textBaseline = 'bottom';
        ctx.fillText(text, cx, bar.y - 3);
      } else {
        ctx.textBaseline = 'top';
        ctx.fillText(text, cx, bar.y + bar.height + 3);
      }
    }
  }
  ctx.restore();
}
