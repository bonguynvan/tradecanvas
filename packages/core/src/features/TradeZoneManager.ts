import type { ViewportState, Theme, DataSeries, TradeZone, TradeZoneStyle } from '@tradecanvas/commons';
import { DEFAULT_TRADE_ZONE_STYLE } from '@tradecanvas/commons';
import { priceToY, barIndexToX, timestampToBarIndex } from '../viewport/ScaleMapping.js';
import { Emitter } from '../realtime/Emitter.js';
import { fillTag } from '../ui/shapes.js';
import { revealZones } from './replayReveal.js';
import { zoneStyleFor } from '../style/overlayColors.js';

interface TradeZoneEvents {
  added: TradeZone;
  removed: string;
  cleared: void;
  [key: string]: unknown;
}

let zoneId = 1;

export class TradeZoneManager extends Emitter<TradeZoneEvents> {
  private zones: TradeZone[] = [];
  private style: TradeZoneStyle = { ...DEFAULT_TRADE_ZONE_STYLE };
  private requestRender: (() => void) | null = null;
  private dataGetter: (() => DataSeries) | null = null;
  /** During a replay: the time it has shown everything before; later trades wait. */
  private revealUntil: number | null = null;
  /** During a replay that leaves the history out: its first bar's time. */
  private revealFrom = -Infinity;
  private pricePrecision = 2;

  setRequestRender(cb: () => void): void {
    this.requestRender = cb;
  }

  setDataGetter(getter: () => DataSeries): void {
    this.dataGetter = getter;
  }

  setPricePrecision(precision: number): void {
    this.pricePrecision = precision;
  }

  setStyle(style: Partial<TradeZoneStyle>): void {
    this.style = { ...this.style, ...style };
    this.requestRender?.();
  }

  getStyle(): TradeZoneStyle {
    return { ...this.style };
  }

  addZone(zone: Omit<TradeZone, 'id'> & { id?: string }): string {
    const id = zone.id ?? `tc_zone_${zoneId++}`;
    const full: TradeZone = { ...zone, id };
    this.zones.push(full);
    this.emit('added', full);
    this.requestRender?.();
    return id;
  }

  updateZone(id: string, updates: Partial<Omit<TradeZone, 'id'>>): void {
    const idx = this.zones.findIndex(z => z.id === id);
    if (idx === -1) return;
    this.zones[idx] = { ...this.zones[idx], ...updates };
    this.requestRender?.();
  }

  removeZone(id: string): void {
    this.zones = this.zones.filter(z => z.id !== id);
    this.emit('removed', id);
    this.requestRender?.();
  }

  getZones(): TradeZone[] {
    return [...this.zones];
  }

  clearZones(): void {
    this.zones = [];
    this.emit('cleared', undefined as unknown as void);
    this.requestRender?.();
  }

  setZones(zones: TradeZone[]): void {
    this.zones = [...zones];
    this.requestRender?.();
  }

  /** Show only the trades entered before `time` (a replay's progress) and from `from` on, open until their exit; `null` shows all. */
  setRevealUntil(time: number | null, from = -Infinity): void {
    if (time === this.revealUntil && from === this.revealFrom) return;
    this.revealUntil = time;
    this.revealFrom = from;
    this.requestRender?.();
  }

  /** The zones drawn: all of them, or those a replay has reached. */
  shownZones(): TradeZone[] {
    return [...revealZones(this.zones, this.revealUntil, this.revealFrom)];
  }

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme): void {
    const data = this.dataGetter?.();
    const zones = revealZones(this.zones, this.revealUntil, this.revealFrom);
    if (!data || data.length === 0 || zones.length === 0) return;

    const { chartRect } = viewport;
    // Their own style, with the chart's style keys over it.
    const style = zoneStyleFor(this.style, theme);

    ctx.save();
    ctx.beginPath();
    ctx.rect(chartRect.x, chartRect.y, chartRect.width, chartRect.height);
    ctx.clip();

    for (const zone of zones) {
      this.renderZone(ctx, zone, data, viewport, theme, style);
    }

    ctx.restore();
  }

  private renderZone(
    ctx: CanvasRenderingContext2D,
    zone: TradeZone,
    data: DataSeries,
    viewport: ViewportState,
    theme: Theme,
    style: TradeZoneStyle,
  ): void {
    const { chartRect } = viewport;

    const entryIdx = timestampToBarIndex(zone.entryTime, data);
    const exitIdx = zone.exitTime != null
      ? timestampToBarIndex(zone.exitTime, data)
      : data.length - 1;

    // Off-screen check in pixels: an entry in the forming bar maps just past
    // the last index, which a data-clamped visible range would cull.
    const x1 = barIndexToX(entryIdx, viewport);
    const x2 = barIndexToX(exitIdx, viewport);
    const left = Math.max(chartRect.x, Math.min(x1, x2));
    const right = Math.min(chartRect.x + chartRect.width, Math.max(x1, x2));
    if (right - left < 1) return;

    const entryY = priceToY(zone.entryPrice, viewport);
    const exitY = zone.exitPrice != null
      ? priceToY(zone.exitPrice, viewport)
      : priceToY(zone.entryPrice, viewport);

    const top = Math.min(entryY, exitY);
    const bottom = Math.max(entryY, exitY);
    const height = Math.max(bottom - top, 2);

    const isActive = zone.exitTime == null;
    const isProfit = zone.pnl != null ? zone.pnl >= 0 : (
      zone.direction === 'long'
        ? (zone.exitPrice ?? zone.entryPrice) >= zone.entryPrice
        : (zone.exitPrice ?? zone.entryPrice) <= zone.entryPrice
    );

    const fillColor = isActive
      ? (style.activeColor ?? '#4c8dff')
      : isProfit
        ? (style.profitColor ?? '#1fa874')
        : (style.lossColor ?? '#e8505b');

    ctx.fillStyle = fillColor;
    ctx.globalAlpha = style.fillOpacity ?? 0.12;
    ctx.fillRect(left, top, right - left, height);
    ctx.globalAlpha = 1;

    const borderWidth = style.borderWidth ?? 1;
    ctx.strokeStyle = fillColor;
    ctx.lineWidth = borderWidth;

    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(left, Math.round(entryY) + 0.5);
    ctx.lineTo(right, Math.round(entryY) + 0.5);
    ctx.stroke();

    if (!isActive && zone.exitPrice != null) {
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(left, Math.round(exitY) + 0.5);
      ctx.lineTo(right, Math.round(exitY) + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const dirIcon = zone.direction === 'long' ? '▲' : '▼';
    ctx.font = `bold 10px ${theme.font.family}`;
    ctx.fillStyle = fillColor;
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'left';
    ctx.fillText(`${dirIcon} ${viewport.formatPrice?.(zone.entryPrice) ?? zone.entryPrice.toFixed(this.pricePrecision)}`, left + 4, entryY - 3);

    if (style.showPnl && !isActive && zone.pnl != null) {
      const pnlSign = zone.pnl >= 0 ? '+' : '';
      const pnlText = zone.pnlPercent != null
        ? `${pnlSign}${zone.pnl.toFixed(2)} (${pnlSign}${zone.pnlPercent.toFixed(2)}%)`
        : `${pnlSign}${zone.pnl.toFixed(2)}`;

      ctx.font = `bold 10px ${theme.font.family}`;
      ctx.fillStyle = fillColor;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'right';

      const bgWidth = ctx.measureText(pnlText).width + 8;
      const bgX = right - bgWidth - 2;
      const bgY = top + 2;
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = theme.background;
      fillTag(ctx, bgX, bgY, bgWidth, 14, theme);
      ctx.globalAlpha = 1;
      ctx.fillStyle = fillColor;
      ctx.fillText(pnlText, right - 4, bgY + 1);
    }

    if (style.showLabel && zone.label) {
      ctx.font = `9px ${theme.font.family}`;
      ctx.fillStyle = fillColor;
      ctx.globalAlpha = 0.8;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.fillText(zone.label, left + 4, entryY + 3);
      ctx.globalAlpha = 1;
    }
  }
}
