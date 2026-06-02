import type { Point } from '@tradecanvas/commons';

export type AxisScaleCallback = (factor: number) => void;
export type AxisResetCallback = () => void;

/**
 * Drag-to-scale handler for price + time axes (TradingView style).
 *
 * Price axis: drag down compresses (factor > 1, expand price range);
 *             drag up expands  (factor < 1, compress price range).
 * Time axis:  drag right compresses (zoom out);
 *             drag left  expands  (zoom in).
 *
 * Sensitivity is logarithmic so the gesture feels natural and stays bounded
 * regardless of drag distance. A small drag threshold (~3px) avoids treating
 * stray clicks as drags so `dblclick` keeps working for axis reset.
 */
export class AxisDragHandler {
  private dragging = false;
  private axis: 'price' | 'time' | null = null;
  private startPos: Point = { x: 0, y: 0 };
  private lastPos: Point = { x: 0, y: 0 };
  private moved = false;
  private readonly threshold = 3;
  private readonly sensitivity = 0.005;

  constructor(
    private onPriceScale: AxisScaleCallback,
    private onTimeScale: AxisScaleCallback,
  ) {}

  begin(axis: 'price' | 'time', pos: Point): void {
    this.dragging = true;
    this.axis = axis;
    this.startPos = pos;
    this.lastPos = pos;
    this.moved = false;
  }

  move(pos: Point): boolean {
    if (!this.dragging || !this.axis) return false;
    const dx = pos.x - this.startPos.x;
    const dy = pos.y - this.startPos.y;
    if (!this.moved && Math.hypot(dx, dy) < this.threshold) return false;
    this.moved = true;

    if (this.axis === 'price') {
      const delta = pos.y - this.lastPos.y;
      // drag DOWN (positive delta) → factor > 1 → range grows → chart visually
      // compresses (each price is closer to mid → bars look smaller vertically)
      const factor = Math.exp(delta * this.sensitivity);
      this.onPriceScale(factor);
    } else {
      const delta = pos.x - this.lastPos.x;
      // drag RIGHT (positive delta) → zoom out (factor > 1 expands range)
      const factor = Math.exp(delta * this.sensitivity);
      this.onTimeScale(factor);
    }

    this.lastPos = pos;
    return true;
  }

  end(): boolean {
    const consumed = this.dragging && this.moved;
    this.dragging = false;
    this.axis = null;
    this.moved = false;
    return consumed;
  }

  isActive(): boolean {
    return this.dragging;
  }
}
