import type { Point, Theme, ViewportState } from '@tradecanvas/commons';

/** Side of the button (px), and its gap from the price axis. */
const SIZE = 16;
const GAP = 3;

/**
 * A "+" at the right edge of the price pane, level with the crosshair: a
 * click on it offers what to do at that price (an alert, an order, a line).
 * It follows the pointer up and down, so a click anywhere in its narrow strip
 * is on it.
 */
export class PriceAxisAddButton {
  private enabled = false;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /** Whether `pos` is on the button: in the price pane, in the strip by the axis. */
  hit(pos: Point, viewport: ViewportState): boolean {
    if (!this.enabled) return false;
    const { x, y, width, height } = viewport.chartRect;
    const left = x + width - SIZE - GAP;
    return pos.x >= left && pos.x <= x + width && pos.y >= y && pos.y <= y + height;
  }

  /** Draw it level with the crosshair at `cursor` (when it is over the price pane). */
  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme, cursor: Point | null): void {
    if (!this.enabled || !cursor) return;
    const { x, y, width, height } = viewport.chartRect;
    if (cursor.y < y || cursor.y > y + height || cursor.x < x || cursor.x > x + width) return;
    const cx = x + width - GAP - SIZE / 2;
    const r = SIZE / 2;
    ctx.fillStyle = theme.background;
    ctx.strokeStyle = theme.axisLabelBackground;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cursor.y, r - 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = theme.text;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.45, cursor.y);
    ctx.lineTo(cx + r * 0.45, cursor.y);
    ctx.moveTo(cx, cursor.y - r * 0.45);
    ctx.lineTo(cx, cursor.y + r * 0.45);
    ctx.stroke();
  }
}
