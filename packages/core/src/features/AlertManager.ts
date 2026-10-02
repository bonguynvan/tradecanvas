import type { ViewportState, Theme, Point } from '@tradecanvas/commons';
import { priceToY } from '../viewport/ScaleMapping.js';
import { Emitter } from '../realtime/Emitter.js';

export type AlertCondition = 'crossingUp' | 'crossingDown' | 'crossing' | 'greaterThan' | 'lessThan';

export interface PriceAlert {
  id: string;
  price: number;
  condition: AlertCondition;
  message?: string;
  triggered: boolean;
  repeating: boolean;
  /** Data channel evaluated against `price`. `'price'` (default) or an
   *  indicator line id like `<instanceId>:<key>`. */
  channel: string;
  /** Human label for the source (e.g. "RSI"). Defaults to the price. */
  label?: string;
  /**
   * The drawing whose line(s) the price is checked against (a trend line, a
   * channel). `price` then follows the drawing's first line at the latest bar.
   */
  drawingId?: string;
}

/** Conditions an alert on a drawing can have: its lines move, so only crossings. */
const DRAWING_CONDITIONS: readonly AlertCondition[] = ['crossing', 'crossingUp', 'crossingDown'];

function crossed(before: number, now: number, condition: AlertCondition): boolean {
  const up = before < 0 && now >= 0;
  const down = before > 0 && now <= 0;
  return condition === 'crossingUp' ? up : condition === 'crossingDown' ? down : up || down;
}

interface AlertEvents {
  triggered: PriceAlert;
  added: PriceAlert;
  removed: string;
  updated: PriceAlert;
  [key: string]: unknown;
}

let alertId = 1;

/**
 * Manages price alerts. Renders alert lines on the chart overlay.
 * Checks each price update against configured alerts and emits 'triggered'.
 */
export class AlertManager extends Emitter<AlertEvents> {
  private alerts: PriceAlert[] = [];
  private lastValues = new Map<string, number>();
  /** Per drawing alert, which side of each of its lines the price was on (-1, 0, 1). */
  private drawingSides = new Map<string, number[]>();
  private drawingLevels: ((drawingId: string) => number[] | null) | null = null;
  private requestRender: (() => void) | null = null;
  private pricePrecision = 2;

  setRequestRender(cb: () => void): void {
    this.requestRender = cb;
  }

  setPricePrecision(precision: number): void {
    this.pricePrecision = precision;
  }

  addAlert(
    price: number,
    condition: AlertCondition = 'crossing',
    message?: string,
    repeating = false,
    channel = 'price',
    label?: string,
  ): string {
    const id = `tc_alert_${alertId++}`;
    const alert: PriceAlert = { id, price, condition, message, triggered: false, repeating, channel, label };
    this.alerts.push(alert);
    this.emit('added', alert);
    this.requestRender?.();
    return id;
  }

  /**
   * Where a drawing's lines are now: its prices at the latest bar, or null
   * when it is gone or doesn't reach that time. Drawing alerts need it.
   */
  setDrawingLevels(resolver: ((drawingId: string) => number[] | null) | null): void {
    this.drawingLevels = resolver;
  }

  /** Alert when the price crosses a drawing's line(s). Throws a RangeError for a non-crossing condition. */
  addDrawingAlert(
    drawingId: string,
    condition: AlertCondition = 'crossing',
    message?: string,
    repeating = false,
    label?: string,
  ): string {
    if (!DRAWING_CONDITIONS.includes(condition)) {
      throw new RangeError(`An alert on a drawing takes a crossing condition, not "${condition}"`);
    }
    const id = `tc_alert_${alertId++}`;
    const price = this.drawingLevels?.(drawingId)?.[0] ?? Number.NaN;
    const alert: PriceAlert = { id, price, condition, message, triggered: false, repeating, channel: 'price', label, drawingId };
    this.alerts.push(alert);
    this.emit('added', alert);
    return id;
  }

  /** Remove every alert on a drawing (it was deleted). */
  removeDrawingAlerts(drawingId: string): void {
    for (const alert of this.alerts.filter((a) => a.drawingId === drawingId)) this.removeAlert(alert.id);
  }

  /**
   * Remove a drawing's alerts and hand them over, to put back with
   * `restoreAlerts` if the drawing comes back (an undo).
   */
  takeDrawingAlerts(drawingId: string): PriceAlert[] {
    const taken = this.alerts.filter((a) => a.drawingId === drawingId);
    for (const alert of taken) this.removeAlert(alert.id);
    return taken.map((a) => ({ ...a }));
  }

  /** Put alerts back (from `takeDrawingAlerts`); ones already here are skipped. */
  restoreAlerts(alerts: readonly PriceAlert[]): void {
    for (const alert of alerts) {
      if (this.alerts.some((a) => a.id === alert.id)) continue;
      const restored = { ...alert };
      this.alerts.push(restored);
      this.emit('added', restored);
    }
    this.requestRender?.();
  }

  /** Remove alerts on drawings that aren't in `drawingIds`. Returns how many went. */
  pruneDrawingAlerts(drawingIds: ReadonlySet<string>): number {
    const orphans = this.alerts.filter((a) => a.drawingId !== undefined && !drawingIds.has(a.drawingId));
    for (const alert of orphans) this.removeAlert(alert.id);
    return orphans.length;
  }

  removeAlert(id: string): void {
    this.drawingSides.delete(id);
    this.alerts = this.alerts.filter((a) => a.id !== id);
    this.emit('removed', id);
    this.requestRender?.();
  }

  getAlerts(): PriceAlert[] {
    return [...this.alerts];
  }

  /** First alert whose line is within `tolerance` px of `point.y`, or null. */
  getAlertAtPoint(point: Point, viewport: ViewportState, tolerance = 6): PriceAlert | null {
    const { chartRect } = viewport;
    if (point.y < chartRect.y || point.y > chartRect.y + chartRect.height) return null;
    let best: PriceAlert | null = null;
    let bestDist = tolerance;
    for (const alert of this.alerts) {
      if (alert.channel !== 'price' || alert.drawingId) continue; // only price alerts have a chart line
      const dist = Math.abs(priceToY(alert.price, viewport) - point.y);
      if (dist <= bestDist) {
        bestDist = dist;
        best = alert;
      }
    }
    return best;
  }

  /** Move an alert to a new price (used by drag). Re-arms a triggered alert. */
  updateAlertPrice(id: string, price: number): void {
    const alert = this.alerts.find((a) => a.id === id);
    if (!alert || !Number.isFinite(price)) return;
    alert.price = price;
    alert.triggered = false;
    this.emit('updated', { ...alert });
    this.requestRender?.();
  }

  clearAlerts(): void {
    this.alerts = [];
    this.requestRender?.();
  }

  /** Call on each price update to check price-channel alerts and alerts on drawings. */
  checkPrice(price: number): void {
    this.checkChannel('price', price);
    this.checkDrawingAlerts(price);
  }

  private checkDrawingAlerts(price: number): void {
    if (!this.drawingLevels || !Number.isFinite(price)) return;
    for (const alert of this.alerts) {
      if (!alert.drawingId) continue;
      const levels = this.drawingLevels(alert.drawingId);
      if (!levels || levels.length === 0) {
        // Not on the chart at this time: a crossing needs two sides seen in a row.
        this.drawingSides.delete(alert.id);
        continue;
      }
      alert.price = levels[0];
      const sides = levels.map((level) => Math.sign(price - level));
      const before = this.drawingSides.get(alert.id);
      this.drawingSides.set(alert.id, sides);
      if (!before || before.length !== sides.length) continue;
      if (sides.some((side, i) => crossed(before[i], side, alert.condition))) {
        if (!alert.triggered) {
          alert.triggered = true;
          this.emit('triggered', { ...alert });
        }
      } else if (alert.repeating) {
        alert.triggered = false;
      }
    }
  }

  /**
   * Evaluate every alert bound to `channel` against `value` (e.g. the latest
   * indicator-line value). The previous value per channel is tracked so
   * crossing conditions work.
   */
  checkChannel(channel: string, value: number): void {
    if (!Number.isFinite(value)) return;
    const prev = this.lastValues.get(channel);
    if (prev === undefined) {
      this.lastValues.set(channel, value);
      return;
    }

    for (const alert of this.alerts) {
      if (alert.channel !== channel || alert.drawingId) continue;

      let conditionMet = false;
      switch (alert.condition) {
        case 'crossingUp':
          conditionMet = prev < alert.price && value >= alert.price;
          break;
        case 'crossingDown':
          conditionMet = prev > alert.price && value <= alert.price;
          break;
        case 'crossing':
          conditionMet = (prev < alert.price && value >= alert.price) ||
                         (prev > alert.price && value <= alert.price);
          break;
        case 'greaterThan':
          conditionMet = value > alert.price;
          break;
        case 'lessThan':
          conditionMet = value < alert.price;
          break;
      }

      // Edge-triggered: fire once on entering the condition. For level
      // conditions (greaterThan/lessThan) this prevents firing every tick while
      // the value stays past the level; repeating alerts re-arm once it leaves.
      if (conditionMet) {
        if (!alert.triggered) {
          alert.triggered = true;
          this.emit('triggered', { ...alert });
        }
      } else if (alert.repeating) {
        alert.triggered = false;
      }
    }

    this.lastValues.set(channel, value);
  }

  /**
   * Forget per-channel previous values. Call on a data context change (symbol /
   * timeframe switch) so the first value of the new context seeds cleanly
   * instead of crossing against a stale previous value.
   */
  clearLastValues(): void {
    this.lastValues.clear();
    this.drawingSides.clear();
  }

  saveToStorage(key: string): void {
    try {
      const data = this.alerts.map(a => ({
        id: a.id, price: a.price, condition: a.condition,
        message: a.message, triggered: a.triggered, repeating: a.repeating,
        channel: a.channel, label: a.label, drawingId: a.drawingId,
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
        if (typeof a.drawingId === 'string' && a.condition && !a.triggered) {
          if (DRAWING_CONDITIONS.includes(a.condition)) this.addDrawingAlert(a.drawingId, a.condition, a.message, a.repeating ?? false, a.label);
        } else if (a.price != null && Number.isFinite(a.price) && a.condition && !a.triggered) {
          this.addAlert(a.price, a.condition, a.message, a.repeating ?? false, a.channel ?? 'price', a.label);
        }
      }
    } catch { /* storage unavailable or corrupt data */ }
  }

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme): void {
    const { chartRect } = viewport;

    for (const alert of this.alerts) {
      if (alert.channel !== 'price' || alert.drawingId) continue; // indicator and drawing alerts have no line of their own
      const y = priceToY(alert.price, viewport);
      if (y < chartRect.y || y > chartRect.y + chartRect.height) continue;

      // Armed: blue. Triggered: amber.
      const color = alert.triggered ? '#f2a93b' : '#4c8dff';

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
