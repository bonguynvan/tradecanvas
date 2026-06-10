import type { Point, ViewportState } from '@tradecanvas/commons';
import { yToPrice } from '../viewport/ScaleMapping.js';
import type { AlertManager } from '../features/AlertManager.js';

/**
 * Drags a price-alert line up and down the chart. Hit-tests against the
 * `AlertManager`'s lines on mousedown; while active, maps the pointer's y back
 * to a price (scale-aware, so log / percentage modes work) and moves the alert.
 */
export class AlertDragHandler {
  private draggingId: string | null = null;

  constructor(
    private alerts: AlertManager,
    private viewportGetter: () => ViewportState | null,
  ) {}

  /** True when the pointer is hovering an alert line (for cursor feedback). */
  isOverAlert(pos: Point): boolean {
    const vp = this.viewportGetter();
    if (!vp) return false;
    return this.alerts.getAlertAtPoint(pos, vp) !== null;
  }

  /** Begin a drag if an alert line is under the pointer. Returns true if consumed. */
  tryBegin(pos: Point): boolean {
    const vp = this.viewportGetter();
    if (!vp) return false;
    const hit = this.alerts.getAlertAtPoint(pos, vp);
    if (!hit) return false;
    this.draggingId = hit.id;
    return true;
  }

  move(pos: Point): void {
    if (this.draggingId === null) return;
    const vp = this.viewportGetter();
    if (!vp) return;
    this.alerts.updateAlertPrice(this.draggingId, yToPrice(pos.y, vp));
  }

  end(): void {
    this.draggingId = null;
  }

  isActive(): boolean {
    return this.draggingId !== null;
  }
}
