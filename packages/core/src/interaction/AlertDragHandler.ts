import type { Point, ViewportState } from '@tradecanvas/commons';
import { yToPrice } from '../viewport/ScaleMapping.js';
import { onGrid, type PriceRounding } from '../viewport/priceGrid.js';
import type { AlertManager } from '../features/AlertManager.js';

/**
 * Drags a price-alert line up and down the chart. Hit-tests against the
 * `AlertManager`'s lines on mousedown; while active, maps the pointer's y back
 * to a price (scale-aware, so log / percentage modes work) and moves the alert.
 */
export class AlertDragHandler {
  private draggingId: string | null = null;
  /** How the price dragged to is put on the market's grid; null leaves it as the pointer has it. */
  private round: PriceRounding | null = null;

  constructor(
    private alerts: AlertManager,
    private viewportGetter: () => ViewportState | null,
  ) {}

  /** Put the price an alert is dragged to on the market's grid (a chart's `roundPrice`); null leaves the pointer's. */
  setPriceRounding(round: PriceRounding | null): void {
    this.round = round;
  }

  /** True when the pointer is hovering an alert line (for cursor feedback). */
  isOverAlert(pos: Point): boolean {
    const vp = this.viewportGetter();
    if (!vp) return false;
    return this.alerts.getAlertAtPoint(pos, vp) !== null;
  }

  /** Begin a drag if an alert line is within `reach` px of the pointer (a finger's is wider). Returns true if consumed. */
  tryBegin(pos: Point, reach?: number): boolean {
    const vp = this.viewportGetter();
    if (!vp) return false;
    const hit = this.alerts.getAlertAtPoint(pos, vp, reach);
    if (!hit) return false;
    this.draggingId = hit.id;
    return true;
  }

  move(pos: Point): void {
    if (this.draggingId === null) return;
    const vp = this.viewportGetter();
    if (!vp) return;
    this.alerts.updateAlertPrice(this.draggingId, onGrid(this.round, yToPrice(pos.y, vp)));
  }

  end(): void {
    this.draggingId = null;
  }

  isActive(): boolean {
    return this.draggingId !== null;
  }
}
