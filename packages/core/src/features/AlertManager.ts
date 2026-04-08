import type { ViewportState, Theme } from '@chart-lib/commons';
import { priceToY } from '../viewport/ScaleMapping.js';
import { PRICE_AXIS_WIDTH } from '@chart-lib/commons';
import { Emitter } from '../realtime/Emitter.js';

export type AlertCondition = 'crossingUp' | 'crossingDown' | 'crossing' | 'greaterThan' | 'lessThan';

export interface PriceAlert {
  id: string;
  price: number;
  condition: AlertCondition;
  message?: string;
  triggered: boolean;
  repeating: boolean;
}

interface AlertEvents {
  triggered: PriceAlert;
  added: PriceAlert;
  removed: string;
}

let alertId = 1;

/**
 * Manages price alerts. Renders alert lines on the chart overlay.
 * Checks each price update against configured alerts and emits 'triggered'.
 */
export class AlertManager extends Emitter<AlertEvents> {
  private alerts: PriceAlert[] = [];
  private lastPrice: number | null = null;
  private requestRender: (() => void) | null = null;
  private pricePrecision = 2;

  setRequestRender(cb: () => void): void {
    this.requestRender = cb;
  }

  setPricePrecision(precision: number): void {
    this.pricePrecision = precision;
  }

  addAlert(price: number, condition: AlertCondition = 'crossing', message?: string, repeating = false): string {
    const id = `alert_${alertId++}`;
    const alert: PriceAlert = { id, price, condition, message, triggered: false, repeating };
    this.alerts.push(alert);
    this.emit('added', alert);
    this.requestRender?.();
    return id;
  }

  removeAlert(id: string): void {
    this.alerts = this.alerts.filter((a) => a.id !== id);
    this.emit('removed', id);
    this.requestRender?.();
  }

  getAlerts(): PriceAlert[] {
    return [...this.alerts];
  }

  clearAlerts(): void {
    this.alerts = [];
    this.requestRender?.();
  }

  /** Call on each price update to check alerts */
  checkPrice(price: number): void {
    if (this.lastPrice === null) {
      this.lastPrice = price;
      return;
    }

    for (const alert of this.alerts) {
      if (alert.triggered && !alert.repeating) continue;

      let triggered = false;
      switch (alert.condition) {
        case 'crossingUp':
          triggered = this.lastPrice < alert.price && price >= alert.price;
          break;
        case 'crossingDown':
          triggered = this.lastPrice > alert.price && price <= alert.price;
          break;
        case 'crossing':
          triggered = (this.lastPrice < alert.price && price >= alert.price) ||
                      (this.lastPrice > alert.price && price <= alert.price);
          break;
        case 'greaterThan':
          triggered = price > alert.price;
          break;
        case 'lessThan':
          triggered = price < alert.price;
          break;
      }

      if (triggered) {
        alert.triggered = true;
        this.emit('triggered', { ...alert });
      }
    }

    this.lastPrice = price;
  }

  saveToStorage(key: string): void {
    try {
      const data = this.alerts.map(a => ({
        id: a.id, price: a.price, condition: a.condition,
        message: a.message, triggered: a.triggered,
      }));
      localStorage.setItem(key, JSON.stringify(data));
    } catch { /* storage unavailable or full */ }
  }

  loadFromStorage(key: string): void {
    try {
      const json = localStorage.getItem(key);
      if (!json) return;
      const data = JSON.parse(json);
      if (!Array.isArray(data)) return;
      for (const a of data) {
        if (a.price && a.condition && !a.triggered) {
          this.addAlert(a.price, a.condition, a.message);
        }
      }
    } catch { /* storage unavailable or corrupt data */ }
  }

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme): void {
    const { chartRect } = viewport;

    for (const alert of this.alerts) {
      const y = priceToY(alert.price, viewport);
      if (y < chartRect.y || y > chartRect.y + chartRect.height) continue;

      const color = alert.triggered ? '#FF9800' : '#FFD700';

      // Alert line
      ctx.setLineDash([2, 6]);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(chartRect.x, Math.round(y) + 0.5);
      ctx.lineTo(chartRect.x + chartRect.width, Math.round(y) + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);

      // Bell icon + price label
      ctx.font = `10px ${theme.font.family}`;
      ctx.fillStyle = color;
      ctx.textBaseline = 'bottom';
      ctx.textAlign = 'right';
      const label = `🔔 ${alert.price.toFixed(this.pricePrecision)}${alert.message ? ` - ${alert.message}` : ''}`;
      ctx.fillText(label, chartRect.x + chartRect.width - 4, y - 2);
    }
  }
}
