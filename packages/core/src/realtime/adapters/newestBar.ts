import { normalizeBarTime } from '@tradecanvas/commons';

/** Symbols and timeframes whose history's last bar is kept; past this many the oldest is let go. */
const MAX_SERVED_SERIES = 64;

const seriesKey = (symbol: string, timeframe: string): string => `${symbol}|${timeframe}`;

/**
 * The newest bar a feed has sent on its connection. A feed that sends bars
 * and no trades makes its ticks from their closes, and a frame of a bar
 * older than the newest (a venue's late final, a revision, a stale frame)
 * is that bar's, not the market's now: a tick from it would move the price,
 * the orders and the alerts back to an old close. A connection starts from
 * the last bar of the history the adapter served for its symbol and
 * timeframe, so a feed that sends its last closed bar again on subscribing
 * makes no tick from it either, after a reconnect too. That bar closed again
 * is the history's own, no newer price, until a forming frame of it comes:
 * a history of closed bars only ends on the bar such a feed sends again.
 */
export class NewestBar {
  private newest = -Infinity;
  /** Whether the newest is the history's last bar, of which no forming frame came on the connection yet. */
  private fromHistory = false;
  /** When the last bar of the history last served for each symbol and timeframe starts, ms. */
  private readonly served = new Map<string, number>();

  /** The history the adapter served for `symbol` and `timeframe`, as its `fetchHistory` gave it. */
  serve(symbol: string, timeframe: string, bars: unknown): void {
    if (!Array.isArray(bars) || bars.length === 0) return;
    const time = normalizeBarTime(Number((bars[bars.length - 1] as { time?: unknown } | null)?.time));
    if (!Number.isFinite(time)) return;
    const key = seriesKey(symbol, timeframe);
    // Deleted first, so the series served last is the last in the map's order.
    this.served.delete(key);
    this.served.set(key, time);
    if (this.served.size > MAX_SERVED_SERIES) this.served.delete(this.served.keys().next().value as string);
  }

  /** A new connection to `symbol` and `timeframe`: no bar sent on it yet, the history served for them the newest. */
  reset(symbol: string, timeframe: string): void {
    const served = this.served.get(seriesKey(symbol, timeframe));
    this.newest = served ?? -Infinity;
    this.fromHistory = served !== undefined;
  }

  /**
   * Whether a frame of the bar at `time`, `closed` or forming, is one of the
   * newest bar or of a newer one, which is then the newest. Times are read
   * by their size, so seconds and milliseconds compare.
   */
  admit(time: number, closed = false): boolean {
    const at = normalizeBarTime(time);
    // A time that isn't a number says nothing of which bar is newest.
    if (!Number.isFinite(at)) return true;
    if (at < this.newest) return false;
    if (at === this.newest && this.fromHistory && closed) return false;
    this.fromHistory = false;
    this.newest = at;
    return true;
  }
}
