import { normalizeBarTime, type OHLCBar } from '@tradecanvas/commons';
import { ServedHistory } from './servedHistory.js';

/**
 * The newest bar a feed has sent on its connection. A feed that sends bars
 * and no trades makes its ticks from their closes, and a frame of a bar
 * older than the newest (a venue's late final, a revision, a stale frame)
 * is that bar's, not the market's now: a tick from it would move the price,
 * the orders and the alerts back to an old close. A connection starts from
 * the last bar of the history the adapter served for its symbol and
 * timeframe, so a feed that sends its last closed bar again on subscribing
 * makes no tick from it either, after a reconnect too. That bar closed again
 * at the close it was served at is the history's own, no newer price, until
 * a forming frame of it comes: a history of closed bars only ends on the bar
 * such a feed sends again. At another close it is the bar's final, the bar
 * served while it was still forming (as most REST endpoints serve the
 * newest bar), and a live price.
 */
export class NewestBar {
  private newest = -Infinity;
  /**
   * The close the history's last bar was served at, while that bar is the
   * newest and no forming frame of it came on the connection; null otherwise.
   */
  private servedClose: number | null = null;
  private readonly served = new ServedHistory();

  /** The history the adapter served for `symbol` and `timeframe`, as its `fetchHistory` gave it. */
  serve(symbol: string, timeframe: string, bars: unknown): void {
    this.served.serve(symbol, timeframe, bars);
  }

  /** A new connection to `symbol` and `timeframe`: no bar sent on it yet, the history served for them the newest. */
  reset(symbol: string, timeframe: string): void {
    const served = this.served.lastBar(symbol, timeframe);
    this.newest = served === undefined ? -Infinity : normalizeBarTime(served.time);
    this.servedClose = served?.close ?? null;
  }

  /**
   * Whether a frame of `bar`, `closed` or forming, is one of the newest bar
   * or of a newer one, which is then the newest. Times are read by their
   * size, so seconds and milliseconds compare.
   */
  admit(bar: Pick<OHLCBar, 'time' | 'close'>, closed = false): boolean {
    const at = normalizeBarTime(bar.time);
    // A time that isn't a number says nothing of which bar is newest.
    if (!Number.isFinite(at)) return true;
    if (at < this.newest) return false;
    if (at === this.newest && closed && bar.close === this.servedClose) return false;
    this.servedClose = null;
    this.newest = at;
    return true;
  }
}
