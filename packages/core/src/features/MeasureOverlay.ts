import type { Point, ViewportState, Theme, DataSeries } from '@tradecanvas/commons';
import { barTimeUnit, formatPrice, priceTagText } from '@tradecanvas/commons';
import { xToBarIndex, yToPrice, barIndexToX, priceToY } from '../viewport/ScaleMapping.js';

/** Decimals the move's percentage shows. */
const PERCENT_DECIMALS = 2;
/** Significant digits a move below 1 shows without a market precision. */
const SMALL_MOVE_DIGITS = 4;
/** Most decimals a move below 1 shows. */
const MAX_DECIMALS = 10;

/**
 * Transient "measure" overlay (the shift-drag ruler).
 *
 * The tool is owned by the chart but lives outside the persistent drawing
 * system on purpose: it is reset on every mouseup so it never clutters saved
 * state, and it doesn't participate in undo/redo.
 *
 * Coordinates are stored in data space (bar index + price) so the overlay
 * tracks the data correctly during pan/zoom while the user is still holding
 * shift.
 */
export class MeasureOverlay {
  private active = false;
  private startBar = 0;
  private startPrice = 0;
  private endBar = 0;
  private endPrice = 0;
  private startTime: number | null = null;
  private endTime: number | null = null;

  isActive(): boolean {
    return this.active;
  }

  begin(pos: Point, viewport: ViewportState, data: DataSeries): void {
    const bar = Math.round(xToBarIndex(pos.x, viewport));
    const price = yToPrice(pos.y, viewport);
    this.startBar = bar;
    this.startPrice = price;
    this.endBar = bar;
    this.endPrice = price;
    this.startTime = barTime(bar, data);
    this.endTime = this.startTime;
    this.active = true;
  }

  update(pos: Point, viewport: ViewportState, data: DataSeries): void {
    if (!this.active) return;
    const bar = Math.round(xToBarIndex(pos.x, viewport));
    this.endBar = bar;
    this.endPrice = yToPrice(pos.y, viewport);
    this.endTime = barTime(bar, data);
  }

  end(): void {
    this.active = false;
  }

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme): void {
    if (!this.active) return;

    const x1 = barIndexToX(this.startBar, viewport);
    const x2 = barIndexToX(this.endBar, viewport);
    const y1 = priceToY(this.startPrice, viewport);
    const y2 = priceToY(this.endPrice, viewport);

    const left = Math.min(x1, x2);
    const right = Math.max(x1, x2);
    const top = Math.min(y1, y2);
    const bottom = Math.max(y1, y2);
    const w = right - left;
    const h = bottom - top;

    const goingUp = this.endPrice >= this.startPrice;
    const color = goingUp ? theme.candleUp : theme.candleDown;
    const fill = withAlpha(color, 0.14);

    ctx.save();
    const { chartRect } = viewport;
    ctx.beginPath();
    ctx.rect(chartRect.x, chartRect.y, chartRect.width, chartRect.height);
    ctx.clip();

    // Selection rectangle
    ctx.fillStyle = fill;
    ctx.fillRect(left, top, w, h);

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(left + 0.5, top + 0.5, w, h);
    ctx.setLineDash([]);

    // Direction line (start anchor → end anchor)
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Anchor dots
    drawDot(ctx, x1, y1, color);
    drawDot(ctx, x2, y2, color);
    ctx.restore();

    // Info pill — placed near the end anchor
    const bars = Math.abs(this.endBar - this.startBar);
    const priceDelta = this.endPrice - this.startPrice;
    const pricePct = this.startPrice !== 0 ? (priceDelta / this.startPrice) * 100 : 0;
    const timeSpan = this.startTime !== null && this.endTime !== null
      ? formatTimeSpan(Math.abs(this.endTime - this.startTime))
      : null;

    const lines: string[] = [];
    const sign = priceDelta > 0 ? '+' : priceDelta < 0 ? '−' : '';
    const absDelta = Math.abs(priceDelta);
    const pctText = formatPrice(Math.abs(pricePct), PERCENT_DECIMALS, viewport.numberLocale ?? 'en-US');
    lines.push(`${sign}${deltaText(absDelta, viewport)}  (${sign}${pctText}%)`);
    lines.push(`${bars} bars${timeSpan ? '  ·  ' + timeSpan : ''}`);

    ctx.save();
    drawPill(ctx, x2, y2, lines, color, theme);
    ctx.restore();
  }
}

function barTime(barIdx: number, data: DataSeries): number | null {
  if (barIdx < 0 || barIdx >= data.length) return null;
  return data[barIdx].time * barTimeUnit(data);
}

/**
 * The size of the move as the chart writes a price: its price format, else
 * grouped in the number locale at the market's or the symbol's decimals, or
 * at those of its size when neither sets them.
 */
function deltaText(delta: number, viewport: ViewportState): string {
  return priceTagText(delta, viewport, viewport.pricePrecision ?? moveDecimals(delta));
}

/** 2 decimals from 1,000 up, 4 from 1, and 4 significant digits below 1. */
function moveDecimals(delta: number): number {
  if (delta >= 1000) return 2;
  if (delta >= 1) return 4;
  if (delta <= 0) return SMALL_MOVE_DIGITS - 1;
  return Math.min(MAX_DECIMALS, SMALL_MOVE_DIGITS - 1 - Math.floor(Math.log10(delta)));
}

function formatTimeSpan(ms: number): string {
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(0)}s`;
  const min = sec / 60;
  if (min < 60) return `${min.toFixed(1)}m`;
  const hr = min / 60;
  if (hr < 24) return `${hr.toFixed(1)}h`;
  const days = hr / 24;
  if (days < 30) return `${days.toFixed(1)}d`;
  const months = days / 30;
  if (months < 12) return `${months.toFixed(1)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

function drawDot(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x, y, 1.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawPill(
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  anchorY: number,
  lines: string[],
  accent: string,
  theme: Theme,
): void {
  const padX = 8;
  const padY = 6;
  const lineH = 14;
  const font = `600 11px ${theme.font.family}`;
  ctx.font = font;

  let maxW = 0;
  for (const line of lines) {
    const w = ctx.measureText(line).width;
    if (w > maxW) maxW = w;
  }
  const w = Math.ceil(maxW) + padX * 2;
  const h = lines.length * lineH + padY * 2;

  // Position below the end anchor by default; flip up if it would go off canvas.
  let x = anchorX + 8;
  let y = anchorY + 8;
  const canvasW = ctx.canvas.clientWidth || ctx.canvas.width;
  if (x + w > canvasW - 4) x = anchorX - w - 8;
  if (x < 4) x = 4;

  // Background
  ctx.fillStyle = theme.background;
  ctx.globalAlpha = 0.96;
  roundRect(ctx, x, y, w, h, 6);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = accent;
  ctx.lineWidth = 1;
  roundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 6);
  ctx.stroke();

  ctx.fillStyle = theme.text;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  for (let i = 0; i < lines.length; i++) {
    ctx.fillStyle = i === 0 ? accent : theme.textSecondary;
    ctx.fillText(lines[i], x + padX, y + padY + i * lineH);
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function withAlpha(color: string, alpha: number): string {
  // Cheap rgba/hex → rgba conversion. Handles #rgb, #rrggbb, rgb(), rgba().
  if (color.startsWith('#')) {
    let r = 0, g = 0, b = 0;
    if (color.length === 4) {
      r = parseInt(color[1] + color[1], 16);
      g = parseInt(color[2] + color[2], 16);
      b = parseInt(color[3] + color[3], 16);
    } else if (color.length >= 7) {
      r = parseInt(color.slice(1, 3), 16);
      g = parseInt(color.slice(3, 5), 16);
      b = parseInt(color.slice(5, 7), 16);
    }
    return `rgba(${r},${g},${b},${alpha})`;
  }
  if (color.startsWith('rgb')) {
    const nums = color.match(/[\d.]+/g);
    if (nums && nums.length >= 3) {
      return `rgba(${nums[0]},${nums[1]},${nums[2]},${alpha})`;
    }
  }
  return color;
}
