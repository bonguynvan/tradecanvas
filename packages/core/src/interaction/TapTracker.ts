import type { Point } from '@tradecanvas/commons';

/** Most time, ms, between the taps of a double tap. */
export const DOUBLE_TAP_MS = 300;
/** Farthest apart, px, the taps of a double tap may land. */
export const DOUBLE_TAP_PX = 24;

/** Tells a double tap from two taps: close in time and place. */
export class TapTracker {
  private last: { pos: Point; at: number } | null = null;

  /** A tap at `pos`: true when it is the second of a double tap (a third starts over). */
  tap(pos: Point, now = Date.now()): boolean {
    const last = this.last;
    if (last && now - last.at <= DOUBLE_TAP_MS && Math.hypot(pos.x - last.pos.x, pos.y - last.pos.y) <= DOUBLE_TAP_PX) {
      this.last = null;
      return true;
    }
    this.last = { pos, at: now };
    return false;
  }

  reset(): void {
    this.last = null;
  }
}
