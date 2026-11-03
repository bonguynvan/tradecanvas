import type { OHLCBar, TimeFrame } from './ohlc.js';
import type { SymbolInfo, SymbolSearchOptions } from './symbol.js';
import type { Quote } from './quote.js';
import type { NewsItem } from './news.js';
import type { ConnectionState, RawTick, Trade } from './realtime.js';

/** Which bars the chart asks a feed for. */
export interface BarsRequest {
  symbol: string;
  timeframe: TimeFrame;
  /** How many bars, counted back from the newest asked for. */
  countBack: number;
  /**
   * Only bars older than this: the time of the oldest bar the chart has, in
   * the bars' own unit. Absent for the first load, which ends at the newest bar.
   */
  before?: number;
  /**
   * Aborted when the chart no longer needs the answer: its stream of this
   * symbol and timeframe disconnected (a switch, a reconnect). Other
   * requests, another symbol's for a compare, run to the end.
   */
  signal: AbortSignal;
}

/** Which live bars the chart subscribes to. */
export interface BarsSubscription {
  symbol: string;
  timeframe: TimeFrame;
}

/**
 * What a feed tells the chart while it is subscribed. Every method is there;
 * a feed calls the ones it has news for.
 */
export interface FeedSubscriber {
  /**
   * A bar from the feed: the forming bar again with its latest values, a new
   * one, or (with `closed`) its final values. An older closed bar corrects
   * the bar loaded at its time.
   */
  bar(bar: OHLCBar, closed: boolean): void;
  /** A trade or quote tick. The chart builds bars from ticks only with `aggregateTicks`. */
  tick(tick: RawTick): void;
  /**
   * The connection's state. A feed that never calls it is taken as connected
   * once `subscribeBars` returns. `'disconnected'` or `'error'` makes the
   * chart load and subscribe again, with its reconnect backoff. The chart
   * doesn't take a quiet feed for a dead one (a daily chart, a closed
   * market): a feed whose socket can die silently says so here.
   */
  connection(state: ConnectionState): void;
  /** What the feed learned about the symbol after the chart asked (`resolveSymbol`). */
  symbolInfo(info: SymbolInfo): void;
  /** Something went wrong that the chart should report; the subscription goes on. */
  error(message: string): void;
}

/**
 * A data source the chart pulls from: it asks for bars (`getBars`) and
 * subscribes to live ones (`subscribeBars`). The chart pages back, reconnects,
 * builds the timeframes the feed lacks and resubscribes on a switch; the feed
 * only answers. One feed serves any number of charts: each subscription is
 * its own.
 *
 * Give it to `chart.connect({ feed, symbol, timeframe })` or a widget's `feed`
 * option. A `DataAdapter` works anywhere a feed does (`feedFromAdapter`).
 */
export interface DataFeed {
  readonly name: string;

  /**
   * Optional: the timeframes the feed serves. Charts build any other (7m,
   * 90m, 2d…) from the coarsest of these that divides it. Leave it out when
   * the feed serves every timeframe.
   */
  readonly supportedTimeframes?: readonly TimeFrame[];

  /**
   * Optional: `false` when the feed has only the newest bars, so the chart
   * never asks for older ones (no paging back, a replay asks for its bars in
   * one request). Default `true`.
   */
  readonly pagesBack?: boolean;

  /**
   * Up to `countBack` bars, sorted by time ascending: the newest for the first
   * load, or the ones before `request.before` when the chart pages back.
   * Return an empty array when there are no more; a feed without older data
   * returns one for any request with `before`.
   */
  getBars(request: BarsRequest): Promise<OHLCBar[]>;

  /** Live bars of `request`'s symbol and timeframe until the function it returns is called. */
  subscribeBars(request: BarsSubscription, subscriber: FeedSubscriber): () => void;

  /** Optional: what the feed knows about `symbol` (price step, `timeZone`, hours), or null. */
  resolveSymbol?(symbol: string): Promise<SymbolInfo | null>;

  /** Optional: symbols matching `query`, best first, for a symbol search box. */
  searchSymbols?(query: string, options?: SymbolSearchOptions): Promise<SymbolInfo[]>;

  /** Optional: live quotes for many symbols until the function it returns is called (a watchlist). */
  subscribeQuotes?(symbols: readonly string[], onQuotes: (quotes: Quote[]) => void): () => void;

  /** Optional: recent headlines about `symbol`, newest first. */
  fetchNews?(symbol: string, limit?: number): Promise<NewsItem[]>;

  /** Optional, with `subscribeTrades`: up to `limit` recent trades, oldest first, for tick timeframes (`'100T'`). */
  fetchTrades?(symbol: string, limit?: number): Promise<Trade[]>;

  /** Optional, with `fetchTrades`: live trades of `symbol` until the function it returns is called. */
  subscribeTrades?(symbol: string, onTrades: (trades: Trade[]) => void): () => void;
}
