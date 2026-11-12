import type { Theme, WaterfallBar, WaterfallOptions } from '@tradecanvas/commons';
import { computeTickStep } from '@tradecanvas/commons';

type BarType = 'positive' | 'negative' | 'total' | 'subtotal';

interface WaterfallLayoutBar {
  label: string;
  value: number;
  start: number;
  end: number;
  type: BarType;
  rectX: number;
  rectY: number;
  rectW: number;
  rectH: number;
  slotX: number;
  slotW: number;
}

interface WaterfallLayout {
  left: number;
  right: number;
  top: number;
  bottom: number;
  plotWidth: number;
  plotHeight: number;
}

const MARGIN_LEFT = 60;
const MARGIN_RIGHT = 12;
const MARGIN_TOP = 24;
const MARGIN_BOTTOM = 40;
const DEFAULT_BAR_WIDTH_RATIO = 0.7;
const MIN_BAR_HEIGHT = 1;

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

function defaultValueFormat(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M';
  if (abs >= 1_000) return (v / 1_000).toFixed(1) + 'K';
  return v.toFixed(2);
}

function computeLayout(width: number, height: number): WaterfallLayout {
  return {
    left: MARGIN_LEFT,
    right: width - MARGIN_RIGHT,
    top: MARGIN_TOP,
    bottom: height - MARGIN_BOTTOM,
    plotWidth: width - MARGIN_LEFT - MARGIN_RIGHT,
    plotHeight: height - MARGIN_TOP - MARGIN_BOTTOM,
  };
}

function buildLayoutBars(
  data: readonly WaterfallBar[],
  layout: WaterfallLayout,
  barWidthRatio: number,
  valMin: number,
  valRange: number,
): { bars: WaterfallLayoutBar[]; cumulatives: number[] } {
  const bars: WaterfallLayoutBar[] = new Array(data.length);
  const cumulatives: number[] = new Array(data.length);
  const slotWidth = layout.plotWidth / data.length;
  const barW = slotWidth * barWidthRatio;
  const slotPadding = (slotWidth - barW) / 2;
  const { left, bottom, plotHeight } = layout;
  const running = runningBars(data);

  for (let i = 0; i < data.length; i++) {
    const bar = data[i];
    const { type, value, start, end } = running[i];

    const top = Math.min(start, end);
    const bot = Math.max(start, end);
    const topY = bottom - ((top - valMin) / valRange) * plotHeight;
    const botY = bottom - ((bot - valMin) / valRange) * plotHeight;
    const rectY = Math.min(topY, botY);
    const rectH = Math.max(Math.abs(botY - topY), MIN_BAR_HEIGHT);
    const slotX = left + i * slotWidth;
    const rectX = slotX + slotPadding;

    bars[i] = {
      label: bar.label,
      value,
      start,
      end,
      type,
      rectX,
      rectY,
      rectW: barW,
      rectH,
      slotX,
      slotW: slotWidth,
    };
    cumulatives[i] = end;
  }

  return { bars, cumulatives };
}

function computeValueRange(
  data: readonly WaterfallBar[],
): { valMin: number; valMax: number } {
  if (data.length === 0) return { valMin: 0, valMax: 1 };

  let min = 0;
  let max = 0;

  for (const { start, end } of runningBars(data)) {
    if (start < min) min = start;
    if (end < min) min = end;
    if (start > max) max = start;
    if (end > max) max = end;
  }

  const range = max - min || 1;
  const padding = range * 0.1;
  return { valMin: min - padding, valMax: max + padding };
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  bg: string,
): void {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  layout: WaterfallLayout,
  valMin: number,
  valMax: number,
  theme: Theme,
  valueFormat: (v: number) => string,
): void {
  const { left, right, top, bottom, plotHeight } = layout;
  const valRange = valMax - valMin || 1;

  ctx.strokeStyle = theme.grid;
  ctx.lineWidth = 0.5;
  ctx.fillStyle = theme.axisLabel;
  ctx.font = `${theme.font.sizeSmall}px ${theme.font.family}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const step = computeTickStep(valMin, valMax, 5);
  const firstTick = Math.ceil(valMin / step) * step;

  // Batch horizontal grid lines
  ctx.beginPath();
  for (let v = firstTick; v <= valMax; v += step) {
    const y = Math.round(bottom - ((v - valMin) / valRange) * plotHeight) + 0.5;
    if (y < top || y > bottom) continue;
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
  }
  ctx.stroke();

  // Labels
  for (let v = firstTick; v <= valMax; v += step) {
    const y = bottom - ((v - valMin) / valRange) * plotHeight;
    if (y < top - 1 || y > bottom + 1) continue;
    ctx.fillText(valueFormat(v), left - 6, y);
  }

  // Zero baseline
  if (valMin < 0 && valMax > 0) {
    const zeroY = Math.round(bottom - ((0 - valMin) / valRange) * plotHeight) + 0.5;
    ctx.strokeStyle = theme.axisLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, zeroY);
    ctx.lineTo(right, zeroY);
    ctx.stroke();
  }
}

function drawBars(
  ctx: CanvasRenderingContext2D,
  bars: readonly WaterfallLayoutBar[],
  colors: Record<BarType, string>,
): void {
  // Group bars by color, draw each color group in a single fill() call.
  // This minimizes fillStyle mutations and path starts.
  const groupOrder: BarType[] = ['positive', 'negative', 'total', 'subtotal'];
  for (let g = 0; g < groupOrder.length; g++) {
    const type = groupOrder[g];
    const color = colors[type];
    let hasAny = false;
    ctx.beginPath();
    for (let i = 0; i < bars.length; i++) {
      const b = bars[i];
      if (b.type !== type) continue;
      const x = Math.round(b.rectX);
      const y = Math.round(b.rectY);
      const w = Math.round(b.rectW);
      const h = Math.round(b.rectH);
      ctx.rect(x, y, w, h);
      hasAny = true;
    }
    if (hasAny) {
      ctx.fillStyle = color;
      ctx.fill();
    }
  }
}

function drawConnectors(
  ctx: CanvasRenderingContext2D,
  bars: readonly WaterfallLayoutBar[],
  layout: WaterfallLayout,
  valMin: number,
  valRange: number,
  color: string,
  style: 'dashed' | 'solid' | 'none',
): void {
  if (style === 'none' || bars.length < 2) return;

  const { bottom, plotHeight } = layout;

  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  if (style === 'dashed') {
    ctx.setLineDash([4, 4]);
  } else {
    ctx.setLineDash([]);
  }

  // Batch all connectors into a single path
  ctx.beginPath();
  for (let i = 0; i < bars.length - 1; i++) {
    const current = bars[i];
    const next = bars[i + 1];

    // Connector sits at the "end" of current bar (running total).
    // For total/subtotal bars, end is bar.value (absolute).
    // For gain/loss, end is the post-bar cumulative.
    const endValue = current.end;
    const y = Math.round(bottom - ((endValue - valMin) / valRange) * plotHeight) + 0.5;

    const x1 = Math.round(current.rectX + current.rectW);
    const x2 = Math.round(next.rectX);
    if (x2 <= x1) continue;

    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawValueLabels(
  ctx: CanvasRenderingContext2D,
  bars: readonly WaterfallLayoutBar[],
  cumulatives: readonly number[],
  theme: Theme,
  valueFormat: (v: number) => string,
  showDelta: boolean,
): void {
  ctx.fillStyle = theme.text;
  ctx.font = `${theme.font.sizeSmall}px ${theme.font.family}`;
  ctx.textAlign = 'center';

  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    let text: string;
    if (b.type === 'total' || b.type === 'subtotal') {
      text = valueFormat(b.value);
    } else if (showDelta) {
      const sign = b.value >= 0 ? '+' : '';
      text = `${sign}${valueFormat(b.value)}`;
    } else {
      text = valueFormat(cumulatives[i]);
    }

    const cx = b.rectX + b.rectW / 2;
    // If bar goes down (negative gain/loss), put label below
    const isDown = b.end < b.start;
    if (isDown) {
      ctx.textBaseline = 'top';
      ctx.fillText(text, cx, b.rectY + b.rectH + 4);
    } else {
      ctx.textBaseline = 'bottom';
      ctx.fillText(text, cx, b.rectY - 4);
    }
  }
}

function drawCategoryLabels(
  ctx: CanvasRenderingContext2D,
  bars: readonly WaterfallLayoutBar[],
  layout: WaterfallLayout,
  theme: Theme,
  labelFormat: (label: string) => string,
): void {
  ctx.fillStyle = theme.axisLabel;
  ctx.font = `${theme.font.sizeSmall}px ${theme.font.family}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const labelY = layout.bottom + 6;
  const maxWidth = bars.length > 0 ? bars[0].slotW - 4 : 0;

  // Rotate if any label would overflow its slot
  let needsRotate = false;
  for (let i = 0; i < bars.length; i++) {
    const w = ctx.measureText(labelFormat(bars[i].label)).width;
    if (w > maxWidth) { needsRotate = true; break; }
  }

  if (!needsRotate) {
    for (let i = 0; i < bars.length; i++) {
      const b = bars[i];
      const cx = b.slotX + b.slotW / 2;
      ctx.fillText(labelFormat(b.label), cx, labelY);
    }
    return;
  }

  // Each label turned about its own end, on top of the canvas's scale: setting
  // the transform outright would drop the device pixel ratio.
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    const cx = b.slotX + b.slotW / 2;
    ctx.save();
    ctx.translate(cx, labelY + 4);
    ctx.rotate(-Math.PI / 4);
    ctx.fillText(labelFormat(b.label), 0, 0);
    ctx.restore();
  }
}

function findHitBar(
  bars: readonly WaterfallLayoutBar[],
  x: number,
  layout: WaterfallLayout,
): number | null {
  if (x < layout.left || x > layout.right) return null;
  // Slot-based hit test (covers gaps between bars too)
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    if (x >= b.slotX && x <= b.slotX + b.slotW) return i;
  }
  return null;
}

function drawCrosshairTooltip(
  ctx: CanvasRenderingContext2D,
  bars: readonly WaterfallLayoutBar[],
  cumulatives: readonly number[],
  hitIndex: number,
  crosshairPos: { x: number; y: number },
  layout: WaterfallLayout,
  theme: Theme,
  valueFormat: (v: number) => string,
): void {
  const bar = bars[hitIndex];
  const cumulative = cumulatives[hitIndex];

  // Vertical guide line across the slot center
  const cx = Math.round(bar.slotX + bar.slotW / 2) + 0.5;
  ctx.strokeStyle = theme.crosshair;
  ctx.lineWidth = 0.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(cx, layout.top);
  ctx.lineTo(cx, layout.bottom);
  ctx.stroke();
  ctx.setLineDash([]);

  const lines = [
    bar.label,
    `Value: ${bar.value >= 0 && (bar.type === 'positive' || bar.type === 'negative') ? '+' : ''}${valueFormat(bar.value)}`,
    `Total: ${valueFormat(cumulative)}`,
  ];

  ctx.font = `${theme.font.sizeSmall}px ${theme.font.family}`;
  let maxTextWidth = 0;
  for (let i = 0; i < lines.length; i++) {
    const w = ctx.measureText(lines[i]).width;
    if (w > maxTextWidth) maxTextWidth = w;
  }
  const tooltipW = maxTextWidth + 16;
  const tooltipH = lines.length * (theme.font.sizeSmall + 4) + 12;

  let tx = crosshairPos.x + 10;
  let ty = crosshairPos.y - tooltipH / 2;
  if (tx + tooltipW > layout.right) tx = crosshairPos.x - tooltipW - 10;
  if (ty < layout.top) ty = layout.top;
  if (ty + tooltipH > layout.bottom) ty = layout.bottom - tooltipH;

  ctx.fillStyle = theme.axisLabelBackground;
  ctx.globalAlpha = 0.9;
  ctx.fillRect(tx, ty, tooltipW, tooltipH);
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.text;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const lineH = theme.font.sizeSmall + 4;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], tx + 8, ty + 6 + i * lineH);
  }
}

export function renderWaterfall(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: WaterfallOptions,
  theme: Theme,
  crosshairPos: { x: number; y: number } | null,
): { hitBar: number | null } {
  const { data } = options;
  if (width <= 0 || height <= 0) return { hitBar: null };
  if (!data || data.length === 0) {
    drawBackground(ctx, width, height, theme.background);
    return { hitBar: null };
  }

  const positiveColor = options.positiveColor ?? theme.candleUp;
  const negativeColor = options.negativeColor ?? theme.candleDown;
  const totalColor = options.totalColor ?? theme.lineColor;
  const subtotalColor = options.subtotalColor ?? theme.textSecondary;
  const connectorColor = options.connectorColor ?? theme.textSecondary;
  const connectorStyle = options.connectorStyle ?? 'dashed';
  const barWidthRatio = options.barWidth ?? DEFAULT_BAR_WIDTH_RATIO;
  const showValues = options.showValues !== false;
  const showDelta = options.showDelta !== false;
  const valueFormat = options.valueFormat ?? defaultValueFormat;
  const labelFormat = options.labelFormat ?? ((l: string) => l);

  const { valMin, valMax } = computeValueRange(data);
  const valRange = valMax - valMin || 1;
  const layout = computeLayout(width, height);
  const { bars, cumulatives } = buildLayoutBars(data, layout, barWidthRatio, valMin, valRange);

  drawBackground(ctx, width, height, theme.background);
  drawGrid(ctx, layout, valMin, valMax, theme, valueFormat);

  // Connectors first (behind bars)
  drawConnectors(ctx, bars, layout, valMin, valRange, connectorColor, connectorStyle);

  // Bars (batched by color)
  drawBars(ctx, bars, {
    positive: positiveColor,
    negative: negativeColor,
    total: totalColor,
    subtotal: subtotalColor,
  });

  if (showValues) {
    drawValueLabels(ctx, bars, cumulatives, theme, valueFormat, showDelta);
  }

  drawCategoryLabels(ctx, bars, layout, theme, labelFormat);

  // Crosshair / tooltip
  const hitBar = crosshairPos ? findHitBar(bars, crosshairPos.x, layout) : null;
  if (crosshairPos && hitBar !== null) {
    drawCrosshairTooltip(ctx, bars, cumulatives, hitBar, crosshairPos, layout, theme, valueFormat);
  }

  return { hitBar };
}
