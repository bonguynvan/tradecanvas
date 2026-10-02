import type { Point } from '@tradecanvas/commons';

/** What a button on an order or position line does. */
export type LineButtonAction =
  | { type: 'cancelOrder'; orderId: string }
  | { type: 'closePosition'; positionId: string }
  | { type: 'reversePosition'; positionId: string }
  | { type: 'removeStop'; positionId: string; which: 'stopLoss' | 'takeProfit' };

/** A button drawn on a line, where it was drawn. */
export interface LineButton {
  x: number;
  y: number;
  size: number;
  action: LineButtonAction;
}

/** Room around a button that still counts as on it (px). */
const SLOP = 2;

export function buttonAt(buttons: readonly LineButton[], pos: Point): LineButton | null {
  // The last drawn is on top.
  for (let i = buttons.length - 1; i >= 0; i--) {
    const b = buttons[i];
    if (pos.x >= b.x - SLOP && pos.x <= b.x + b.size + SLOP && pos.y >= b.y - SLOP && pos.y <= b.y + b.size + SLOP) return b;
  }
  return null;
}

/** A square button filled with `color`, a cross on it. */
export function drawCloseButton(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, size, size);
  const inset = size * 0.3;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + inset, y + inset);
  ctx.lineTo(x + size - inset, y + size - inset);
  ctx.moveTo(x + size - inset, y + inset);
  ctx.lineTo(x + inset, y + size - inset);
  ctx.stroke();
}

/** A square button filled with `color`, an up and a down arrow on it (reverse). */
export function drawReverseButton(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, size, size);
  const top = y + size * 0.25;
  const bottom = y + size * 0.75;
  const left = x + size * 0.35;
  const right = x + size * 0.65;
  const head = size * 0.14;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(left, bottom);
  ctx.lineTo(left, top);
  ctx.moveTo(left - head, top + head);
  ctx.lineTo(left, top);
  ctx.lineTo(left + head, top + head);
  ctx.moveTo(right, top);
  ctx.lineTo(right, bottom);
  ctx.moveTo(right - head, bottom - head);
  ctx.lineTo(right, bottom);
  ctx.lineTo(right + head, bottom - head);
  ctx.stroke();
}
