import type { BarsRequest, BarsSubscription, DataFeed, FeedSubscriber, OHLCBar, TimeFrame } from '@tradecanvas/commons';

const key = (symbol: string, timeframe: TimeFrame): string => `${symbol}\u0000${timeframe}`;

/**
 * A feed of bars you hand it: the history of each symbol and timeframe
 * (`setBars`) and the live bars after it (`pushBar`). The charts subscribed
 * to a series get each pushed bar, and later loads (a reconnect, a switch
 * back) include it, so the bars have one writer, the feed.
 *
 * @example
 * const feed = new ManualFeed();
 * feed.setBars('AAPL', '1d', history);
 * chart.connect({ feed, symbol: 'AAPL', timeframe: '1d' });
 * feed.pushBar('AAPL', '1d', todaysBar); // the forming bar, again and again
 */
export class ManualFeed implements DataFeed {
  readonly name: string;
  private series = new Map<string, OHLCBar[]>();
  private subscribers = new Map<string, Set<FeedSubscriber>>();

  constructor(options: { name?: string } = {}) {
    this.name = options.name ?? 'manual';
  }

  /** Replaces the bars of `symbol` and `timeframe` (copied, sorted by time) for the loads after it. */
  setBars(symbol: string, timeframe: TimeFrame, bars: readonly OHLCBar[]): void {
    const sorted = bars.map((bar) => ({ ...bar })).sort((a, b) => a.time - b.time);
    this.series.set(key(symbol, timeframe), sorted);
  }

  /**
   * A live bar of `symbol` and `timeframe`: the newest again with its latest
   * values, a newer one, or, older, the final values of the bar at its time
   * (sent as closed). Throws a RangeError for an older bar the series lacks.
   */
  pushBar(symbol: string, timeframe: TimeFrame, bar: OHLCBar, closed = false): void {
    const id = key(symbol, timeframe);
    const bars = this.series.get(id) ?? [];
    const last = bars[bars.length - 1];
    const copy = { ...bar };
    let final = closed;
    if (!last || copy.time > last.time) {
      this.series.set(id, [...bars, copy]);
    } else {
      const at = bars.findIndex((b) => b.time === copy.time);
      if (at < 0) throw new RangeError(`ManualFeed: no ${symbol} ${timeframe} bar at ${copy.time} to replace`);
      // An older bar is past: its values are final.
      if (at < bars.length - 1) final = true;
      this.series.set(id, bars.map((b, i) => (i === at ? copy : b)));
    }
    for (const subscriber of [...(this.subscribers.get(id) ?? [])]) subscriber.bar({ ...copy }, final);
  }

  async getBars(request: BarsRequest): Promise<OHLCBar[]> {
    const bars = this.series.get(key(request.symbol, request.timeframe)) ?? [];
    const { before } = request;
    const upTo = before === undefined ? bars.length : lowerBound(bars, before);
    return bars.slice(Math.max(0, upTo - request.countBack), upTo).map((bar) => ({ ...bar }));
  }

  subscribeBars(request: BarsSubscription, subscriber: FeedSubscriber): () => void {
    const id = key(request.symbol, request.timeframe);
    let set = this.subscribers.get(id);
    if (!set) {
      set = new Set();
      this.subscribers.set(id, set);
    }
    set.add(subscriber);
    return () => {
      set.delete(subscriber);
      if (set.size === 0) this.subscribers.delete(id);
    };
  }
}

/** Index of the first bar at or after `time` in bars sorted by time. */
function lowerBound(bars: readonly OHLCBar[], time: number): number {
  let lo = 0;
  let hi = bars.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (bars[mid].time < time) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
