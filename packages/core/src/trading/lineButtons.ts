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

/** Whether two buttons do the same thing (to the same order or position). */
export function sameLineAction(a: LineButtonAction, b: LineButtonAction): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'cancelOrder') return a.orderId === (b as typeof a).orderId;
  if (a.type === 'removeStop') return a.positionId === (b as typeof a).positionId && a.which === (b as typeof a).which;
  return a.positionId === (b as typeof a).positionId;
}

/**
 * The button a press at `pos` is on, else the nearest whose margin (`slop`,
 * wider for a finger) it is in: in a column of buttons the margins overlap,
 * and the one under the press must win over a neighbour drawn after it.
 */
export function buttonAt(buttons: readonly LineButton[], pos: Point, slop = SLOP): LineButton | null {
  const on = (b: LineButton, room: number) =>
    pos.x >= b.x - room && pos.x <= b.x + b.size + room && pos.y >= b.y - room && pos.y <= b.y + b.size + room;
  // The last drawn is on top.
  for (let i = buttons.length - 1; i >= 0; i--) if (on(buttons[i], 0)) return buttons[i];
  let nearest: LineButton | null = null;
  let best = Infinity;
  for (const b of buttons) {
    if (!on(b, slop)) continue;
    const d = Math.hypot(pos.x - (b.x + b.size / 2), pos.y - (b.y + b.size / 2));
    if (d < best) {
      best = d;
      nearest = b;
    }
  }
  return nearest;
}
