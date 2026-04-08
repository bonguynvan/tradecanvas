import type { Point, ViewportState, Theme, DataSeries } from '@chart-lib/commons';
import { formatPrice, PRICE_AXIS_WIDTH } from '@chart-lib/commons';
import { xToBarIndex, yToPrice, barIndexToX } from '../viewport/ScaleMapping.js';

export type CrosshairCallback = (barIndex: number | null, point: Point | null) => void;

export type CrosshairMode = 'normal' | 'magnet' | 'hidden';

export class CrosshairHandler {
  private position: Point | null = null;
  private callback: CrosshairCallback | null = null;
  private data: DataSeries = [];
  private magnetMode = true;
  private mode: CrosshairMode = 'magnet';
  private pricePrecision = 2;

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

    // Price label on Y axis
    const price = yToPrice(y, viewport);
    const priceText = formatPrice(price, this.pricePrecision);
    const labelX = chartRect.x + chartRect.width + 1;
    ctx.fillStyle = theme.axisLabelBackground;
    ctx.fillRect(labelX, y - 10, PRICE_AXIS_WIDTH - 2, 20);
    ctx.fillStyle = theme.axisLabel;
    ctx.font = `${theme.font.sizeSmall}px ${theme.font.family}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(priceText, labelX + 5, y);
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
