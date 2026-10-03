import type { ViewportState, Theme, DataSeries, SignalMarker, SignalMarkerStyle } from '@tradecanvas/commons';
import { DEFAULT_SIGNAL_STYLE } from '@tradecanvas/commons';
import { priceToY, barIndexToX, timestampToBarIndex } from '../viewport/ScaleMapping.js';
import { Emitter } from '../realtime/Emitter.js';

interface SignalMarkerEvents {
  added: SignalMarker;
  removed: string;
  cleared: void;
  [key: string]: unknown;
}

let markerId = 1;

/** Pixels around a marker's arrow that still count as on it. */
const MARKER_SLOP = 3;

export class SignalMarkerManager extends Emitter<SignalMarkerEvents> {
  private markers: SignalMarker[] = [];
  private style: SignalMarkerStyle = { ...DEFAULT_SIGNAL_STYLE };
  private requestRender: (() => void) | null = null;
  private dataGetter: (() => DataSeries) | null = null;

  setRequestRender(cb: () => void): void {
    this.requestRender = cb;
  }

  setDataGetter(getter: () => DataSeries): void {
    this.dataGetter = getter;
  }

  setStyle(style: Partial<SignalMarkerStyle>): void {
    this.style = { ...this.style, ...style };
    this.requestRender?.();
  }

  getStyle(): SignalMarkerStyle {
    return { ...this.style };
  }

  addMarker(marker: Omit<SignalMarker, 'id'> & { id?: string }): string {
    const id = marker.id ?? `tc_signal_${markerId++}`;
    const full: SignalMarker = { ...marker, id };
    this.markers.push(full);
    this.emit('added', full);
    this.requestRender?.();
    return id;
  }

  removeMarker(id: string): void {
    this.markers = this.markers.filter(m => m.id !== id);
    this.emit('removed', id);
    this.requestRender?.();
  }

  getMarkers(): SignalMarker[] {
    return [...this.markers];
  }

  clearMarkers(): void {
    this.markers = [];
    this.emit('cleared', undefined as unknown as void);
    this.requestRender?.();
  }

  setMarkers(markers: SignalMarker[]): void {
    this.markers = [...markers];
    this.requestRender?.();
  }

  /**
   * The marker under `point` (the one drawn last when several overlap), or
   * null. Its arrow and a few pixels around it count.
   */
  markerAt(point: { x: number; y: number }, viewport: ViewportState): SignalMarker | null {
    const data = this.dataGetter?.();
    if (!data || data.length === 0) return null;
    const { chartRect } = viewport;
    if (point.x < chartRect.x || point.x > chartRect.x + chartRect.width || point.y < chartRect.y || point.y > chartRect.y + chartRect.height) return null;
    const arrowSize = this.style.arrowSize ?? 12;
    for (let i = this.markers.length - 1; i >= 0; i--) {
      const marker = this.markers[i];
      const x = barIndexToX(timestampToBarIndex(marker.time, data), viewport);
      const y = priceToY(marker.price, viewport);
      const size = arrowSize * Math.max(0.6, Math.min(1, marker.confidence));
      // The arrow points from y towards its tip: up for a long, down for a short.
      const top = marker.direction === 'long' ? y - size : marker.direction === 'short' ? y - size * 0.4 : y - size * 0.4;
      const bottom = marker.direction === 'long' ? y + size * 0.4 : marker.direction === 'short' ? y + size : y + size * 0.4;
      if (Math.abs(point.x - x) <= size * 0.6 + MARKER_SLOP && point.y >= top - MARKER_SLOP && point.y <= bottom + MARKER_SLOP) return marker;
    }
    return null;
  }

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme): void {
    const data = this.dataGetter?.();
    if (!data || data.length === 0 || this.markers.length === 0) return;

    const { chartRect } = viewport;
    const style = this.style;
    const arrowSize = style.arrowSize ?? 12;

    ctx.save();
    ctx.beginPath();
    ctx.rect(chartRect.x, chartRect.y, chartRect.width, chartRect.height);
    ctx.clip();

    for (const marker of this.markers) {
      const barIdx = timestampToBarIndex(marker.time, data);
      // Pixel bounds below decide visibility (markers may sit past the last bar).

      const x = barIndexToX(barIdx, viewport);
      const y = priceToY(marker.price, viewport);

      if (x < chartRect.x - arrowSize || x > chartRect.x + chartRect.width + arrowSize) continue;
      if (y < chartRect.y - arrowSize || y > chartRect.y + chartRect.height + arrowSize) continue;

      const color = this.resolveColor(marker, style);
      const scaledSize = arrowSize * Math.max(0.6, Math.min(1, marker.confidence));

      this.renderArrow(ctx, x, y, marker.direction, scaledSize, color);

      if (style.showLabel && marker.label) {
        ctx.font = `10px ${theme.font.family}`;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = marker.direction === 'long' ? 'top' : 'bottom';
        const labelY = marker.direction === 'long' ? y + scaledSize + 3 : y - scaledSize - 3;
        ctx.fillText(marker.label, x, labelY);
      }

      if (style.showConfidence && marker.confidence < 1) {
        ctx.font = `9px ${theme.font.family}`;
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.7;
        ctx.textAlign = 'center';
        ctx.textBaseline = marker.direction === 'long' ? 'top' : 'bottom';
        const confY = marker.direction === 'long'
          ? y + scaledSize + (marker.label ? 14 : 3)
          : y - scaledSize - (marker.label ? 14 : 3);
        ctx.fillText(`${Math.round(marker.confidence * 100)}%`, x, confY);
        ctx.globalAlpha = 1;
      }
    }

    ctx.restore();
  }

  private resolveColor(marker: SignalMarker, style: SignalMarkerStyle): string {
    if (marker.color) return marker.color;
    if (style.sourceColors?.[marker.source]) return style.sourceColors[marker.source];
    switch (marker.direction) {
      case 'long': return style.longColor ?? '#1fa874';
      case 'short': return style.shortColor ?? '#e8505b';
      default: return style.neutralColor ?? '#9E9E9E';
    }
  }

  private renderArrow(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    direction: string,
    size: number,
    color: string,
  ): void {
    ctx.fillStyle = color;
    ctx.beginPath();

    if (direction === 'long') {
      ctx.moveTo(x, y - size);
      ctx.lineTo(x - size * 0.6, y);
      ctx.lineTo(x - size * 0.2, y);
      ctx.lineTo(x - size * 0.2, y + size * 0.4);
      ctx.lineTo(x + size * 0.2, y + size * 0.4);
      ctx.lineTo(x + size * 0.2, y);
      ctx.lineTo(x + size * 0.6, y);
    } else if (direction === 'short') {
      ctx.moveTo(x, y + size);
      ctx.lineTo(x - size * 0.6, y);
      ctx.lineTo(x - size * 0.2, y);
      ctx.lineTo(x - size * 0.2, y - size * 0.4);
      ctx.lineTo(x + size * 0.2, y - size * 0.4);
      ctx.lineTo(x + size * 0.2, y);
      ctx.lineTo(x + size * 0.6, y);
    } else {
      ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
    }

    ctx.closePath();
    ctx.fill();
  }
}
