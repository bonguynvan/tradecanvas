import { normalizeBarTime } from '@tradecanvas/commons';

/**
 * The newest bar a feed has sent on its connection. A feed that sends bars
 * and no trades makes its ticks from their closes, and a frame of a bar
 * older than the newest (a venue's late final, a revision, a stale frame)
 * is that bar's, not the market's now: a tick from it would move the price,
 * the orders and the alerts back to an old close.
 */
export class NewestBar {
  private newest = -Infinity;

  /** A new connection: no bar sent on it yet. */
  reset(): void {
    this.newest = -Infinity;
  }

  /**
   * Whether a frame of the bar at `time` is one of the newest bar or of a
   * newer one, which is then the newest. Times are read by their size, so
   * seconds and milliseconds compare.
   */
  admit(time: number): boolean {
    const at = normalizeBarTime(time);
    // A time that isn't a number says nothing of which bar is newest.
    if (!Number.isFinite(at)) return true;
    if (at < this.newest) return false;
    this.newest = at;
    return true;
  }
}
