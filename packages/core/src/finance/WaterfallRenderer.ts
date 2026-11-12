import type { Theme, WaterfallBar, WaterfallOptions } from '@tradecanvas/commons';
import {
  AXIS_GAP,
  BOTTOM_LABELS,
  CHART_PAD,
  LABEL_GAP,
  LABEL_SIZE,
  axisFormat,
  defaultFormat,
  drawTooltip,
  drawValueAxis,
  fitText,
  fontOf,
  hairline,
  niceScale,
  scaleToPx,
  strokeHairline,
  type Measure,
  type NiceScale,
  type Rect,
  type TooltipLine,
} from './chartKit.js';

type BarType = 'positive' | 'negative' | 'total' | 'subtotal';

export interface WaterfallBarRect extends Rect {
  label: string;
  value: number;
  type: BarType;
  /** The running total before the bar and after it. */
  start: number;
  end: number;
  /** The bar's slot along the bottom: where its label goes, and what the pointer picks it by. */
  slotX: number;
  slotWidth: number;
}

export interface WaterfallLayout {
  plot: Rect;
  scale: NiceScale;
  bars: WaterfallBarRect[];
  /** Labels too long for their slots are turned 45 degrees, in this much room under the plot. */
  turned: boolean;
  labelRoom: number;
}

const DEFAULT_BAR_WIDTH_RATIO = 0.7;
const MIN_BAR_HEIGHT = 1;
/** Turned labels take at most this share of the chart's height: the smaller part of a golden cut. */
const MAX_TURNED_SHARE = 0.382;
const TURN = Math.PI / 4;
/** Room between a bar and its value. */
const VALUE_GAP = 4;

/** A bar with no type is a step: up, or down. One of zero is a step that changes nothing. */
function resolveType(bar: WaterfallBar): BarType {
  if (bar.type) return bar.type;
  return bar.value < 0 ? 'negative' : 'positive';
}

interface RunningBar { type: BarType; value: number; start: number; end: number }

/**
 * Where each bar starts and ends: a step from the total so far, a total or a
 * subtotal from zero, the total being its value from there on. A value that
 * is no number counts as zero, so one bad step does not lose the rest.
 */
function runningBars(data: readonly WaterfallBar[]): RunningBar[] {
  let cumulative = 0;
  return data.map((bar) => {
    const type = resolveType(bar);
    const value = Number.isFinite(bar.value) ? bar.value : 0;
    const start = type === 'total' || type === 'subtotal' ? 0 : cumulative;
    const end = start + value;
    cumulative = end;
    return { type, value, start, end };
  });
}

/** Where the bars go, for a chart `width` by `height`. */
export function computeWaterfallLayout(options: WaterfallOptions, width: number, height: number, measure: Measure): WaterfallLayout {
  const data = options.data ?? [];
  const running = runningBars(data);
  let lo = 0;
  let hi = 0;
  for (const { start, end } of running) {
    lo = Math.min(lo, start, end);
    hi = Math.max(hi, start, end);
  }
  // A tenth more at an end the bars reach, for the values written past them.
  const reach = (hi - lo || 1) * 0.1;
  const scale = niceScale(lo < 0 ? lo - reach : 0, hi > 0 ? hi + reach : 0, 5);
  const format = options.valueFormat ?? axisFormat(scale);
  const tickWidth = Math.max(0, ...scale.ticks.map((t) => measure(format(t), LABEL_SIZE)));
  const left = CHART_PAD + tickWidth + AXIS_GAP;
  const plotWidth = Math.max(1, width - left - CHART_PAD);

  const count = Math.max(1, data.length);
  const slotWidth = plotWidth / count;
  const labelFormat = options.labelFormat ?? ((l: string) => l);
  const widest = Math.max(0, ...data.map((b) => measure(labelFormat(b.label), LABEL_SIZE)));
  const turned = widest > slotWidth - 4;
  // A turned label reaches down by its length's sine, and by its own height's cosine.
  const labelRoom = turned
    ? Math.min(height * MAX_TURNED_SHARE, Math.ceil((widest + LABEL_SIZE) * Math.sin(TURN)) + LABEL_GAP)
    : BOTTOM_LABELS;
  const plot: Rect = { x: left, y: CHART_PAD, width: plotWidth, height: Math.max(1, height - CHART_PAD * 2 - labelRoom) };

  const ratio = Math.min(1, Math.max(0.05, options.barWidth ?? DEFAULT_BAR_WIDTH_RATIO));
  const barWidth = slotWidth * ratio;
  const y = (v: number) => scaleToPx(scale, v, plot.y, plot.height, true);
  const bars = running.map((r, i): WaterfallBarRect => {
    const top = Math.min(y(r.start), y(r.end));
    const slotX = plot.x + i * slotWidth;
    return {
      label: data[i].label,
      value: r.value,
      type: r.type,
      start: r.start,
      end: r.end,
      x: slotX + (slotWidth - barWidth) / 2,
      y: top,
      width: barWidth,
      height: Math.max(MIN_BAR_HEIGHT, Math.abs(y(r.end) - y(r.start))),
      slotX,
      slotWidth,
    };
  });
  return { plot, scale, bars, turned, labelRoom };
}

/** The bar whose slot holds x (inside the plot), or -1. */
export function hitWaterfallBar(layout: WaterfallLayout, x: number): number {
  const { plot, bars } = layout;
  if (bars.length === 0 || x < plot.x || x > plot.x + plot.width) return -1;
  return Math.min(bars.length - 1, Math.floor((x - plot.x) / bars[0].slotWidth));
}

function drawConnectors(ctx: CanvasRenderingContext2D, layout: WaterfallLayout, color: string, style: 'dashed' | 'solid' | 'none'): void {
  const { bars, scale, plot } = layout;
  if (style === 'none') return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.setLineDash(style === 'dashed' ? [4, 4] : []);
  for (let i = 0; i < bars.length - 1; i++) {
    const from = bars[i].x + bars[i].width;
    const to = bars[i + 1].x;
    // Each joins a bar's end, the total it leaves, to the bar that starts from it.
    const y = scaleToPx(scale, bars[i].end, plot.y, plot.height, true);
    if (to > from) strokeHairline(ctx, from, y, to, y);
  }
  ctx.restore();
}

/** Each bar's value past its end: above a rise, under a fall. One that would run into the one before is left out. */
function drawValues(ctx: CanvasRenderingContext2D, layout: WaterfallLayout, theme: Theme, format: (v: number) => string, showDelta: boolean): void {
  ctx.save();
  ctx.font = fontOf(theme, LABEL_SIZE - 1);
  ctx.fillStyle = theme.textSecondary;
  ctx.textAlign = 'center';
  const drawn: Rect[] = [];
  for (const bar of layout.bars) {
    const step = bar.type === 'positive' || bar.type === 'negative';
    const text = !step ? format(bar.value) : showDelta ? `${bar.value >= 0 ? '+' : ''}${format(bar.value)}` : format(bar.end);
    const width = ctx.measureText(text).width;
    const down = bar.end < bar.start;
    const cx = bar.x + bar.width / 2;
    const box: Rect = { x: cx - width / 2, y: down ? bar.y + bar.height + VALUE_GAP : bar.y - VALUE_GAP - LABEL_SIZE, width, height: LABEL_SIZE };
    const clash = drawn.some((d) => box.x < d.x + d.width + 2 && d.x < box.x + box.width + 2 && box.y < d.y + d.height && d.y < box.y + box.height);
    if (clash) continue;
    drawn.push(box);
    ctx.textBaseline = down ? 'top' : 'bottom';
    ctx.fillText(text, Math.round(cx), Math.round(down ? box.y : bar.y - VALUE_GAP));
  }
  ctx.restore();
}

function drawLabels(ctx: CanvasRenderingContext2D, layout: WaterfallLayout, theme: Theme, labelFormat: (l: string) => string, measure: Measure): void {
  const { plot, bars, turned, labelRoom } = layout;
  ctx.save();
  ctx.font = fontOf(theme, LABEL_SIZE);
  ctx.fillStyle = theme.axisLabel;
  const y = plot.y + plot.height + LABEL_GAP;
  if (!turned) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const bar of bars) ctx.fillText(labelFormat(bar.label), Math.round(bar.slotX + bar.slotWidth / 2), y);
    ctx.restore();
    return;
  }
  // Each turned about its own end, on top of the canvas's scale, and cut to
  // what the room under the plot and the chart's left edge leave it.
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const bar of bars) {
    const cx = bar.slotX + bar.slotWidth / 2;
    const reach = Math.min((labelRoom - LABEL_GAP) / Math.sin(TURN) - LABEL_SIZE, (cx - 2) / Math.cos(TURN));
    const text = fitText(labelFormat(bar.label), reach, measure);
    if (!text) continue;
    ctx.save();
    ctx.translate(cx, y + 2);
    ctx.rotate(-TURN);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

export function renderWaterfall(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: WaterfallOptions,
  theme: Theme,
  crosshairPos: { x: number; y: number } | null,
  measure?: Measure,
): { hitBar: number | null } {
  if (width <= 0 || height <= 0) return { hitBar: null };
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, width, height);
  const data = options.data;
  if (!data || data.length === 0) return { hitBar: null };

  const measureText: Measure = measure ?? ((text, size = LABEL_SIZE) => {
    ctx.font = fontOf(theme, size);
    return ctx.measureText(text).width;
  });
  const layout = computeWaterfallLayout(options, width, height, measureText);
  const { plot, scale, bars } = layout;
  const tickFormat = options.valueFormat ?? axisFormat(scale);
  const format = options.valueFormat ?? defaultFormat;
  const colors: Record<BarType, string> = {
    positive: options.positiveColor ?? theme.candleUp,
    negative: options.negativeColor ?? theme.candleDown,
    total: options.totalColor ?? theme.lineColor,
    subtotal: options.subtotalColor ?? theme.textSecondary,
  };

  drawValueAxis(ctx, plot, scale, 'vertical', theme, tickFormat);
  drawConnectors(ctx, layout, options.connectorColor ?? theme.textSecondary, options.connectorStyle ?? 'dashed');

  // Bars on whole device pixels across, so neighbours have edges alike.
  const line = hairline(ctx);
  for (const bar of bars) {
    const x = line.x(bar.x) - line.width / 2;
    const right = line.x(bar.x + bar.width) - line.width / 2;
    ctx.fillStyle = colors[bar.type];
    ctx.fillRect(x, bar.y, Math.max(line.width, right - x), bar.height);
  }

  // The zero line over the bars' feet.
  ctx.strokeStyle = theme.axisLine;
  const zero = scaleToPx(scale, 0, plot.y, plot.height, true);
  strokeHairline(ctx, plot.x, zero, plot.x + plot.width, zero);

  if (options.showValues !== false) drawValues(ctx, layout, theme, format, options.showDelta !== false);
  drawLabels(ctx, layout, theme, options.labelFormat ?? ((l: string) => l), measureText);

  const hit = crosshairPos ? hitWaterfallBar(layout, crosshairPos.x) : -1;
  if (crosshairPos && hit >= 0) {
    const bar = bars[hit];
    const cx = bar.slotX + bar.slotWidth / 2;
    ctx.save();
    ctx.strokeStyle = theme.crosshair;
    ctx.setLineDash([4, 4]);
    strokeHairline(ctx, cx, plot.y, cx, plot.y + plot.height);
    ctx.restore();
    const step = bar.type === 'positive' || bar.type === 'negative';
    const lines: TooltipLine[] = [{ text: bar.label, bold: true }];
    // A step shows what it added and the total it leaves; a total is its own value.
    if (step) lines.push({ text: `${bar.value >= 0 ? '+' : ''}${format(bar.value)}`, color: colors[bar.type] });
    lines.push({ text: step ? `= ${format(bar.end)}` : format(bar.end), color: step ? undefined : colors[bar.type] });
    drawTooltip(ctx, lines, crosshairPos, { x: 0, y: 0, width, height }, theme);
  }
  return { hitBar: hit >= 0 ? hit : null };
}
