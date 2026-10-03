import type { Point, ViewportState, Theme, DataSeries, TimeFormatter, TimeZoneSetting } from '@tradecanvas/commons';
import { autoPricePrecision, timeParts, isDateOnly } from '@tradecanvas/commons';
import { priceScaleText } from '../axis/PriceAxis.js';
import { xToBarIndex, yToPrice, barIndexToX, barIndexToTime } from '../viewport/ScaleMapping.js';

export type CrosshairCallback = (barIndex: number | null, point: Point | null) => void;

export type CrosshairMode = 'normal' | 'magnet' | 'hidden';

export class CrosshairHandler {
  private position: Point | null = null;
  private callback: CrosshairCallback | null = null;
  private data: DataSeries = [];
  private tz: TimeZoneSetting = null;
  private timeFormatter: TimeFormatter | null = null;

  /** An IANA zone, a fixed UTC offset in minutes, or null for the browser's zone. */
  /** Times in your words (the crosshair's label), or null for its own. */
  setTimeFormatter(formatter: TimeFormatter | null): void {
    this.timeFormatter = formatter;
  }

  setTimezoneOffset(tz: TimeZoneSetting): void {
    this.tz = tz;
  }
  private magnetMode = true;
  private mode: CrosshairMode = 'magnet';
  /** Fixed decimals for the price pill; `null` follows the price axis. */
  private pricePrecision: number | null = null;
  private locale = 'en-US';

  // Deferred callback state — avoid calling during render
  private syncedSlot: number | null = null;
  private pendingBarIndex: number | null = null;
  private pendingPoint: Point | null = null;
  private callbackScheduled = false;
  private lastCallbackBarIndex = -1;
  /** Vertical span (px) where the hovered bar is reported; null = the price pane only. */
  private reportTop: number | null = null;
  private reportBottom: number | null = null;

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

  setPricePrecision(precision: number | null): void {
    this.pricePrecision = precision;
  }

  setLocale(locale: string): void {
    this.locale = locale;
  }

  getPosition(): Point | null {
    return this.position;
  }

  /**
   * Mirror another chart's crosshair: a vertical line and time label at bar
   * slot `slot` (null clears it). Never fires the callback, so a mirrored
   * crosshair is not echoed back. The pointer's own crosshair wins.
   */
  setSyncedSlot(slot: number | null): void {
    this.syncedSlot = slot !== null && Number.isFinite(slot) ? slot : null;
  }

  getSyncedSlot(): number | null {
    return this.syncedSlot;
  }

  /**
   * Also report the hovered bar between `top` and `bottom` (px), e.g. over
   * indicator panes stacked above and below the price pane. The crosshair is
   * still drawn on the price pane only. `null` reports on the price pane only.
   */
  setReportBounds(bounds: { top: number; bottom: number } | null): void {
    this.reportTop = bounds?.top ?? null;
    this.reportBottom = bounds?.bottom ?? null;
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
    if (this.mode === 'hidden') return;
    if (!this.position) {
      if (this.syncedSlot !== null) this.renderSynced(ctx, viewport, theme, this.syncedSlot);
      return;
    }
    const { chartRect } = viewport;
    let { x, y } = this.position;

    if (x < chartRect.x || x > chartRect.x + chartRect.width) return;
    const plotBottom = chartRect.y + chartRect.height;
    // Over the indicator panes the hovered bar is still reported; they draw
    // their own crosshair.
    if (y < Math.min(this.reportTop ?? chartRect.y, chartRect.y)) return;
    if (y > Math.max(this.reportBottom ?? plotBottom, plotBottom)) return;
    const inPlot = y >= chartRect.y && y <= plotBottom;

    // The slot under the cursor — may lie past the newest bar (empty future
    // space the chart can be panned into). Magnet snaps to slots there too,
    // instead of welding the line to the last bar.
    const slot = xToBarIndex(x, viewport);
    const barIndex = Math.max(0, Math.min(this.data.length - 1, slot));
    const onBar = slot >= 0 && slot < this.data.length;

    if (this.magnetMode) {
      x = barIndexToX(slot, viewport);
    }

    // Defer callback — only fire if bar changed, and fire AFTER render via microtask
    if (barIndex !== this.lastCallbackBarIndex) {
      this.pendingBarIndex = barIndex;
      this.pendingPoint = { x, y };
      this.lastCallbackBarIndex = barIndex;
      this.scheduleCallback();
    }
    if (!inPlot) return;

    // Subtle "hovered bar" tint — a translucent column behind the crosshair
    // so users have unambiguous visual feedback about which bar they're
    // sitting on. Especially helpful in dense candle charts.
    if (this.magnetMode && onBar) drawBarTint(ctx, x, viewport, theme);

    // Draw crosshair lines — minimal work, no DOM, no allocations
    drawVerticalLine(ctx, x, chartRect, theme);

    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(chartRect.x, Math.round(y) + 0.5);
    ctx.lineTo(chartRect.x + chartRect.width, Math.round(y) + 0.5);
    ctx.stroke();

    ctx.setLineDash([]);
  }

  /**
   * Render the axis hover labels — price pill on the right, time pill on the
   * bottom. Called on the UI pass (after the axes) so the badges always sit
   * on top of the static axis labels, with a small notch.
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
    if (this.mode === 'hidden') return;
    if (!this.position) {
      if (this.syncedSlot !== null) this.renderSyncedTimeLabel(ctx, viewport, theme, data, this.syncedSlot, timeAxisY);
      return;
    }
    const { chartRect } = viewport;
    let { x, y } = this.position;
    if (x < chartRect.x || x > chartRect.x + chartRect.width) return;
    if (y < chartRect.y || y > chartRect.y + chartRect.height) return;

    const slot = xToBarIndex(x, viewport);
    if (this.magnetMode) {
      x = barIndexToX(slot, viewport);
    }

    const font = `600 ${theme.font.sizeSmall}px ${theme.font.family}`;

    // ── Price pill (right axis) ──
    const price = yToPrice(y, viewport);
    const precision = this.pricePrecision ?? autoPricePrecision(viewport.priceRange.min, viewport.priceRange.max);
    const priceText = priceScaleText(price, viewport, precision, this.locale);
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
    this.drawTimePill(ctx, viewport, theme, data, slot, x, timeAxisY);
  }

  /** The mirrored crosshair: only the time is shared, so only the vertical line. */
  private renderSynced(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme, slot: number): void {
    const x = barIndexToX(slot, viewport);
    const { chartRect } = viewport;
    if (x < chartRect.x || x > chartRect.x + chartRect.width) return;
    if (this.magnetMode && slot >= 0 && slot < this.data.length) drawBarTint(ctx, x, viewport, theme);
    drawVerticalLine(ctx, x, chartRect, theme);
  }

  private renderSyncedTimeLabel(
    ctx: CanvasRenderingContext2D,
    viewport: ViewportState,
    theme: Theme,
    data: DataSeries,
    slot: number,
    timeAxisY?: number,
  ): void {
    const x = barIndexToX(slot, viewport);
    const { chartRect } = viewport;
    if (x < chartRect.x || x > chartRect.x + chartRect.width) return;
    this.drawTimePill(ctx, viewport, theme, data, slot, x, timeAxisY);
  }

  private drawTimePill(
    ctx: CanvasRenderingContext2D,
    viewport: ViewportState,
    theme: Theme,
    data: DataSeries,
    slot: number,
    x: number,
    timeAxisY?: number,
  ): void {
    if (data.length === 0) return;
    // Past either end of the data the time is extrapolated.
    const time = barIndexToTime(slot, data);
    const timeText = this.timeFormatter
      ? this.timeFormatter(time > 1e12 ? time : time * 1000, { kind: 'crosshair', timeZone: this.tz })
      : formatBarTime(time, this.tz);
    drawAxisPill(ctx, {
      text: timeText,
      anchorX: x,
      anchorY: timeAxisY ?? (viewport.chartRect.y + viewport.chartRect.height),
      orientation: 'bottom',
      bg: theme.text,
      fg: theme.background,
      font: `600 ${theme.font.sizeSmall}px ${theme.font.family}`,
    });
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

function drawBarTint(ctx: CanvasRenderingContext2D, x: number, viewport: ViewportState, theme: Theme): void {
  const barUnit = viewport.barWidth + viewport.barSpacing;
  ctx.fillStyle = theme.crosshair;
  ctx.globalAlpha = 0.08;
  ctx.fillRect(x - barUnit / 2, viewport.chartRect.y, barUnit, viewport.chartRect.height);
  ctx.globalAlpha = 1;
}

function drawVerticalLine(ctx: CanvasRenderingContext2D, x: number, chartRect: ViewportState['chartRect'], theme: Theme): void {
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = theme.crosshair;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(Math.round(x) + 0.5, chartRect.y);
  ctx.lineTo(Math.round(x) + 0.5, chartRect.y + chartRect.height);
  ctx.stroke();
  ctx.setLineDash([]);
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
 * Axis hover pill. A rectangle with a small triangular
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

function formatBarTime(rawTime: number, tz: TimeZoneSetting): string {
  const ms = rawTime > 1e12 ? rawTime : rawTime * 1000;
  const parts = timeParts(ms, tz);
  const { year, month: m, day, hours: h, minutes: mm } = parts;
  // Same rule as TimeAxis's own label: a daily-or-larger bar has no time-of-day to show, so the
  // year takes that space instead — `${m}/${day}` alone is ambiguous once bars span years apart.
  if (isDateOnly(parts)) return `${m}/${day}/${year}`;
  return `${m}/${day} ${h < 10 ? '0' + h : h}:${mm < 10 ? '0' + mm : mm}`;
}
