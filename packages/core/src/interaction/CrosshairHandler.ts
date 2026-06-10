import type { Point, ViewportState, Theme, DataSeries } from '@tradecanvas/commons';
import { formatPrice, timeParts } from '@tradecanvas/commons';
import { xToBarIndex, yToPrice, barIndexToX } from '../viewport/ScaleMapping.js';

export type CrosshairCallback = (barIndex: number | null, point: Point | null) => void;

export type CrosshairMode = 'normal' | 'magnet' | 'hidden';

export class CrosshairHandler {
  private position: Point | null = null;
  private callback: CrosshairCallback | null = null;
  private data: DataSeries = [];
  private tzOffsetMinutes: number | null = null;

  /** null = browser-local timezone; a number = fixed UTC offset in minutes. */
  setTimezoneOffset(minutes: number | null): void {
    this.tzOffsetMinutes = minutes;
  }
  private magnetMode = true;
  private mode: CrosshairMode = 'magnet';
  private pricePrecision = 2;
  private locale = 'en-US';

  // Deferred callback state — avoid calling during render
  private pendingBarIndex: number | null = null;
  private pendingPoint: Point | null = null;
  private callbackScheduled = false;
  private lastCallbackBarIndex = -1;

  setCallback(cb: CrosshairCallback): void {
    this.callback = cb;
  }

  setData(data: DataSeries): void {
    this.data = data;
  }

  setMagnetMode(enabled: boolean): void {
    this.magnetMode = enabled;
    this.mode = enabled ? 'magnet' : 'normal';
  }

  setMode(mode: CrosshairMode): void {
    this.mode = mode;
    this.magnetMode = mode === 'magnet';
  }

  getMode(): CrosshairMode {
    return this.mode;
  }

  setPricePrecision(precision: number): void {
    this.pricePrecision = precision;
  }

  setLocale(locale: string): void {
    this.locale = locale;
  }

  getPosition(): Point | null {
    return this.position;
  }

  onPointerMove(pos: Point): void {
    this.position = pos;
  }

  onPointerLeave(): void {
    this.position = null;
    this.pendingBarIndex = null;
    this.pendingPoint = null;
    this.lastCallbackBarIndex = -1;
    this.flushCallback(null, null);
  }

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme): void {
    if (!this.position || this.mode === 'hidden') return;
    const { chartRect } = viewport;
    let { x, y } = this.position;

    if (x < chartRect.x || x > chartRect.x + chartRect.width) return;
    if (y < chartRect.y || y > chartRect.y + chartRect.height) return;

    let barIndex = xToBarIndex(x, viewport);
    barIndex = Math.max(0, Math.min(this.data.length - 1, barIndex));

    if (this.magnetMode && barIndex >= 0 && barIndex < this.data.length) {
      x = barIndexToX(barIndex, viewport);
    }

    // Defer callback — only fire if bar changed, and fire AFTER render via microtask
    if (barIndex !== this.lastCallbackBarIndex) {
      this.pendingBarIndex = barIndex;
      this.pendingPoint = { x, y };
      this.lastCallbackBarIndex = barIndex;
      this.scheduleCallback();
    }

    // Subtle "hovered bar" tint — a translucent column behind the crosshair
    // so users have unambiguous visual feedback about which bar they're
    // sitting on. Especially helpful in dense candle charts.
    if (this.magnetMode && barIndex >= 0 && barIndex < this.data.length) {
      const barUnit = viewport.barWidth + viewport.barSpacing;
      const halfUnit = barUnit / 2;
      ctx.fillStyle = theme.crosshair;
      ctx.globalAlpha = 0.08;
      ctx.fillRect(x - halfUnit, chartRect.y, barUnit, chartRect.height);
      ctx.globalAlpha = 1;
    }

    // Draw crosshair lines — minimal work, no DOM, no allocations
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = theme.crosshair;
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(Math.round(x) + 0.5, chartRect.y);
    ctx.lineTo(Math.round(x) + 0.5, chartRect.y + chartRect.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(chartRect.x, Math.round(y) + 0.5);
    ctx.lineTo(chartRect.x + chartRect.width, Math.round(y) + 0.5);
    ctx.stroke();

    ctx.setLineDash([]);
  }

  /**
   * Render the axis hover labels — price pill on the right, time pill on the
   * bottom. Called on the UI pass (after the axes) so the badges always sit
   * on top of the static axis labels. TradingView-style with a small notch.
   *
   * `timeAxisY` lets the host place the bottom label at the actual time axis
   * baseline (which moves when bottom panels are open).
   */
  renderAxisLabels(
    ctx: CanvasRenderingContext2D,
    viewport: ViewportState,
    theme: Theme,
    data: DataSeries,
    timeAxisY?: number,
  ): void {
    if (!this.position || this.mode === 'hidden') return;
    const { chartRect } = viewport;
    let { x, y } = this.position;
    if (x < chartRect.x || x > chartRect.x + chartRect.width) return;
    if (y < chartRect.y || y > chartRect.y + chartRect.height) return;

    let barIndex = xToBarIndex(x, viewport);
    barIndex = Math.max(0, Math.min(data.length - 1, barIndex));
    if (this.magnetMode && barIndex >= 0 && barIndex < data.length) {
      x = barIndexToX(barIndex, viewport);
    }

    const font = `600 ${theme.font.sizeSmall}px ${theme.font.family}`;

    // ── Price pill (right axis) ──
    const price = yToPrice(y, viewport);
    const priceText = formatPrice(price, this.pricePrecision, this.locale);
    const priceAxisX = chartRect.x + chartRect.width;
    drawAxisPill(ctx, {
      text: priceText,
      anchorX: priceAxisX,
      anchorY: y,
      orientation: 'right',
      bg: theme.text,
      fg: theme.background,
      font,
    });

    // ── Time pill (bottom axis) ──
    if (barIndex >= 0 && barIndex < data.length) {
      const timeText = formatBarTime(data[barIndex].time, this.tzOffsetMinutes);
      const axisY = timeAxisY ?? (chartRect.y + chartRect.height);
      drawAxisPill(ctx, {
        text: timeText,
        anchorX: x,
        anchorY: axisY,
        orientation: 'bottom',
        bg: theme.text,
        fg: theme.background,
        font,
      });
    }
  }

  /** Fire callback outside of render frame via microtask */
  private scheduleCallback(): void {
    if (this.callbackScheduled) return;
    this.callbackScheduled = true;
    queueMicrotask(() => {
      this.callbackScheduled = false;
      this.flushCallback(this.pendingBarIndex, this.pendingPoint);
    });
  }

  private flushCallback(barIndex: number | null, point: Point | null): void {
    this.callback?.(barIndex, point);
  }
}

interface AxisPillOptions {
  text: string;
  anchorX: number;
  anchorY: number;
  orientation: 'right' | 'bottom';
  bg: string;
  fg: string;
  font: string;
}

/**
 * TradingView-style axis hover pill. A rectangle with a small triangular
 * notch pointing toward the crosshair line, painted in inverted theme
 * colors so it always pops against the axis strip.
 */
function drawAxisPill(ctx: CanvasRenderingContext2D, opts: AxisPillOptions): void {
  ctx.save();
  ctx.font = opts.font;
  const padX = 8;
  const padY = 4;
  const notch = 5;
  const textW = Math.ceil(ctx.measureText(opts.text).width);
  const w = textW + padX * 2;
  const h = 20 + padY * 0;

  if (opts.orientation === 'right') {
    const x = opts.anchorX + notch;
    const y = opts.anchorY - h / 2;
    ctx.beginPath();
    ctx.moveTo(opts.anchorX, opts.anchorY);
    ctx.lineTo(x, opts.anchorY - notch);
    ctx.lineTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, opts.anchorY + notch);
    ctx.closePath();
    ctx.fillStyle = opts.bg;
    ctx.fill();

    ctx.fillStyle = opts.fg;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(opts.text, x + padX, opts.anchorY);
  } else {
    const x = opts.anchorX - w / 2;
    const y = opts.anchorY + notch;
    ctx.beginPath();
    ctx.moveTo(opts.anchorX, opts.anchorY);
    ctx.lineTo(opts.anchorX + notch, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y);
    ctx.lineTo(opts.anchorX - notch, y);
    ctx.closePath();
    ctx.fillStyle = opts.bg;
    ctx.fill();

    ctx.fillStyle = opts.fg;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(opts.text, opts.anchorX, y + h / 2);
  }
  ctx.restore();
}

function formatBarTime(rawTime: number, tzOffsetMinutes: number | null): string {
  const ms = rawTime > 1e12 ? rawTime : rawTime * 1000;
  const { month: m, day, hours: h, minutes: mm } = timeParts(ms, tzOffsetMinutes);
  return `${m}/${day} ${h < 10 ? '0' + h : h}:${mm < 10 ? '0' + mm : mm}`;
}
