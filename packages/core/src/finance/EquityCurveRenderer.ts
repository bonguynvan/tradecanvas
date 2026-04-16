import type { EquityCurveOptions, EquityPoint, Theme } from '@tradecanvas/commons';
import { computeTickStep } from '@tradecanvas/commons';

interface EquityLayout {
  left: number;
  right: number;
  top: number;
  bottom: number;
  plotWidth: number;
  plotHeight: number;
}

const MARGIN_LEFT = 70;
const MARGIN_BOTTOM = 30;
const PADDING_RIGHT = 20;
const PADDING_TOP = 20;
const VALUE_PADDING_FACTOR = 0.05;

function computeLayout(width: number, height: number): EquityLayout {
  return {
    left: MARGIN_LEFT,
    right: width - PADDING_RIGHT,
    top: PADDING_TOP,
    bottom: height - MARGIN_BOTTOM,
    plotWidth: width - MARGIN_LEFT - PADDING_RIGHT,
    plotHeight: height - PADDING_TOP - MARGIN_BOTTOM,
  };
}

function computeValueRange(
  data: readonly EquityPoint[],
  benchmark: readonly EquityPoint[] | undefined,
): { valMin: number; valMax: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const pt of data) {
    if (pt.value < min) min = pt.value;
    if (pt.value > max) max = pt.value;
  }
  if (benchmark) {
    for (const pt of benchmark) {
      if (pt.value < min) min = pt.value;
      if (pt.value > max) max = pt.value;
    }
  }
  const padding = (max - min) * VALUE_PADDING_FACTOR;
  return { valMin: min - padding, valMax: max + padding };
}

function buildPeakArray(data: readonly EquityPoint[]): readonly number[] {
  const peaks: number[] = [];
  let peak = -Infinity;
  for (const pt of data) {
    if (pt.value > peak) peak = pt.value;
    peaks.push(peak);
  }
  return peaks;
}

function selectTimeFormat(
  rangeMs: number,
): (ts: number) => string {
  const DAY = 86_400_000;
  const YEAR = 365.25 * DAY;

  if (rangeMs < 7 * DAY) {
    // Show hours
    const fmt = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });
    return (ts: number) => fmt.format(new Date(ts));
  }
  if (rangeMs < YEAR) {
    // Show month/day
    const fmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
    return (ts: number) => fmt.format(new Date(ts));
  }
  // Show month/year
  const fmt = new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' });
  return (ts: number) => fmt.format(new Date(ts));
}

function defaultValueFormat(val: number): string {
  if (Math.abs(val) >= 1_000_000) return (val / 1_000_000).toFixed(2) + 'M';
  if (Math.abs(val) >= 1_000) return (val / 1_000).toFixed(1) + 'K';
  return val.toFixed(2);
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
  layout: EquityLayout,
  valMin: number,
  valMax: number,
  timeMin: number,
  timeMax: number,
  theme: Theme,
  valueFormat: (v: number) => string,
  formatTime: (ts: number) => string,
): void {
  const { left, right, top, bottom, plotWidth, plotHeight } = layout;

  ctx.save();
  ctx.strokeStyle = theme.grid;
  ctx.lineWidth = 0.5;
  ctx.fillStyle = theme.axisLabel;
  ctx.font = `${theme.font.sizeSmall}px ${theme.font.family}`;

  // Value axis (left) - horizontal grid lines
  const valStep = computeTickStep(valMin, valMax, 6);
  const firstValTick = Math.ceil(valMin / valStep) * valStep;
  for (let v = firstValTick; v <= valMax; v += valStep) {
    const y = bottom - ((v - valMin) / (valMax - valMin)) * plotHeight;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(valueFormat(v), left - 6, y);
  }

  // Time axis (bottom) - vertical grid lines
  const timeRange = timeMax - timeMin;
  const timeStep = computeTickStep(timeMin, timeMax, 6);
  const firstTimeTick = Math.ceil(timeMin / timeStep) * timeStep;
  for (let t = firstTimeTick; t <= timeMax; t += timeStep) {
    const x = left + ((t - timeMin) / timeRange) * plotWidth;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(formatTime(t), x, bottom + 4);
  }

  ctx.restore();
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  data: readonly EquityPoint[],
  layout: EquityLayout,
  timeMin: number,
  timeRange: number,
  valMin: number,
  valRange: number,
  color: string,
  lineWidth: number,
): void {
  if (data.length < 2) return;

  const { left, bottom, plotWidth, plotHeight } = layout;
  const toX = (ts: number): number => left + ((ts - timeMin) / timeRange) * plotWidth;
  const toY = (v: number): number => bottom - ((v - valMin) / valRange) * plotHeight;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(toX(data[0].time), toY(data[0].value));
  for (let i = 1; i < data.length; i++) {
    ctx.lineTo(toX(data[i].time), toY(data[i].value));
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}

function drawAreaFill(
  ctx: CanvasRenderingContext2D,
  data: readonly EquityPoint[],
  layout: EquityLayout,
  timeMin: number,
  timeRange: number,
  valMin: number,
  valRange: number,
  color: string,
): void {
  if (data.length < 2) return;

  const { left, bottom, plotWidth, plotHeight } = layout;
  const toX = (ts: number): number => left + ((ts - timeMin) / timeRange) * plotWidth;
  const toY = (v: number): number => bottom - ((v - valMin) / valRange) * plotHeight;

  const gradient = ctx.createLinearGradient(0, layout.top, 0, bottom);
  gradient.addColorStop(0, color + '40');
  gradient.addColorStop(1, 'transparent');

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(toX(data[0].time), toY(data[0].value));
  for (let i = 1; i < data.length; i++) {
    ctx.lineTo(toX(data[i].time), toY(data[i].value));
  }
  ctx.lineTo(toX(data[data.length - 1].time), bottom);
  ctx.lineTo(toX(data[0].time), bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();
}

function drawDrawdown(
  ctx: CanvasRenderingContext2D,
  data: readonly EquityPoint[],
  peaks: readonly number[],
  layout: EquityLayout,
  timeMin: number,
  timeRange: number,
  valMin: number,
  valRange: number,
  drawdownColor: string,
): void {
  if (data.length < 2) return;

  const { left, bottom, plotWidth, plotHeight } = layout;
  const toX = (ts: number): number => left + ((ts - timeMin) / timeRange) * plotWidth;
  const toY = (v: number): number => bottom - ((v - valMin) / valRange) * plotHeight;

  ctx.save();
  ctx.fillStyle = drawdownColor;
  ctx.beginPath();

  // Draw peak line forward
  ctx.moveTo(toX(data[0].time), toY(peaks[0]));
  for (let i = 1; i < data.length; i++) {
    ctx.lineTo(toX(data[i].time), toY(peaks[i]));
  }
  // Draw equity line backward
  for (let i = data.length - 1; i >= 0; i--) {
    ctx.lineTo(toX(data[i].time), toY(data[i].value));
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBenchmarkLabel(
  ctx: CanvasRenderingContext2D,
  benchmark: readonly EquityPoint[],
  layout: EquityLayout,
  timeMin: number,
  timeRange: number,
  valMin: number,
  valRange: number,
  label: string,
  color: string,
  theme: Theme,
): void {
  if (benchmark.length === 0) return;

  const { left, bottom, plotWidth, plotHeight } = layout;
  const last = benchmark[benchmark.length - 1];
  const x = left + ((last.time - timeMin) / timeRange) * plotWidth;
  const y = bottom - ((last.value - valMin) / valRange) * plotHeight;

  ctx.save();
  ctx.font = `${theme.font.sizeSmall}px ${theme.font.family}`;
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + 4, y);
  ctx.restore();
}

function drawCrosshairTooltip(
  ctx: CanvasRenderingContext2D,
  crosshairPos: { x: number; y: number },
  data: readonly EquityPoint[],
  benchmark: readonly EquityPoint[] | undefined,
  layout: EquityLayout,
  timeMin: number,
  timeRange: number,
  valMin: number,
  valRange: number,
  theme: Theme,
  formatTime: (ts: number) => string,
  valueFormat: (v: number) => string,
): void {
  const { left, top, bottom, plotWidth, plotHeight } = layout;
  const mx = crosshairPos.x;

  if (mx < left || mx > layout.right) return;

  // Vertical crosshair line
  ctx.save();
  ctx.strokeStyle = theme.crosshair;
  ctx.lineWidth = 0.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(mx, top);
  ctx.lineTo(mx, bottom);
  ctx.stroke();
  ctx.restore();

  // Find closest data point
  const timeAtMouse = timeMin + ((mx - left) / plotWidth) * timeRange;
  let closestIdx = 0;
  let closestDist = Infinity;
  for (let i = 0; i < data.length; i++) {
    const dist = Math.abs(data[i].time - timeAtMouse);
    if (dist < closestDist) {
      closestDist = dist;
      closestIdx = i;
    }
  }

  const pt = data[closestIdx];
  const lines = [
    formatTime(pt.time),
    `Value: ${valueFormat(pt.value)}`,
  ];

  if (benchmark && benchmark.length > closestIdx) {
    lines.push(`Benchmark: ${valueFormat(benchmark[closestIdx].value)}`);
  }

  // Draw dot on equity line
  const dotX = left + ((pt.time - timeMin) / timeRange) * plotWidth;
  const dotY = bottom - ((pt.value - valMin) / valRange) * plotHeight;
  ctx.beginPath();
  ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
  ctx.fillStyle = theme.lineColor;
  ctx.fill();

  // Tooltip box
  ctx.save();
  ctx.font = `${theme.font.sizeSmall}px ${theme.font.family}`;
  const maxTextWidth = Math.max(...lines.map(l => ctx.measureText(l).width));
  const tooltipW = maxTextWidth + 16;
  const tooltipH = lines.length * (theme.font.sizeSmall + 4) + 12;

  let tx = mx + 10;
  let ty = crosshairPos.y - tooltipH / 2;
  if (tx + tooltipW > layout.right) tx = mx - tooltipW - 10;
  if (ty < top) ty = top;
  if (ty + tooltipH > bottom) ty = bottom - tooltipH;

  ctx.fillStyle = theme.axisLabelBackground;
  ctx.globalAlpha = 0.9;
  ctx.fillRect(tx, ty, tooltipW, tooltipH);
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.text;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], tx + 8, ty + 6 + i * (theme.font.sizeSmall + 4));
  }
  ctx.restore();
}

export function renderEquityCurve(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: EquityCurveOptions,
  theme: Theme,
  crosshairPos: { x: number; y: number } | null,
): void {
  const { data } = options;
  if (data.length < 2 || width <= 0 || height <= 0) return;

  const lineColor = options.lineColor ?? theme.lineColor;
  const lineWidth = options.lineWidth ?? 1.5;
  const drawdownEnabled = options.drawdown === true;
  const drawdownColor = options.drawdownColor ?? (theme.candleDown + '30');
  const fillArea = options.fillArea === true;
  const benchmark = options.benchmark;
  const benchmarkColor = options.benchmarkColor ?? theme.textSecondary;
  const benchmarkLabel = options.benchmarkLabel ?? 'Benchmark';
  const valueFormat = options.valueFormat ?? defaultValueFormat;

  const { valMin, valMax } = computeValueRange(data, benchmark);
  const valRange = valMax - valMin || 1;

  const timeMin = data[0].time;
  const timeMax = data[data.length - 1].time;
  const timeRange = timeMax - timeMin || 1;

  const formatTime = options.timeFormat ?? selectTimeFormat(timeRange);
  const layout = computeLayout(width, height);

  drawBackground(ctx, width, height, theme.background);
  drawGrid(ctx, layout, valMin, valMax, timeMin, timeMax, theme, valueFormat, formatTime);

  // Drawdown shading
  if (drawdownEnabled) {
    const peaks = buildPeakArray(data);
    drawDrawdown(ctx, data, peaks, layout, timeMin, timeRange, valMin, valRange, drawdownColor);
  }

  // Area fill under equity line
  if (fillArea) {
    drawAreaFill(ctx, data, layout, timeMin, timeRange, valMin, valRange, lineColor);
  }

  // Equity line
  drawLine(ctx, data, layout, timeMin, timeRange, valMin, valRange, lineColor, lineWidth);

  // Benchmark line
  if (benchmark && benchmark.length >= 2) {
    drawLine(ctx, benchmark, layout, timeMin, timeRange, valMin, valRange, benchmarkColor, 1);
    drawBenchmarkLabel(ctx, benchmark, layout, timeMin, timeRange, valMin, valRange, benchmarkLabel, benchmarkColor, theme);
  }

  // Crosshair
  if (crosshairPos) {
    drawCrosshairTooltip(
      ctx, crosshairPos, data, benchmark,
      layout, timeMin, timeRange, valMin, valRange,
      theme, formatTime, valueFormat,
    );
  }
}
