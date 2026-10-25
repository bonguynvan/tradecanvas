import type { OHLCBar, TimeFrame } from './ohlc.js';
import type { SymbolInfo, SymbolSearchOptions } from './symbol.js';
import type { Quote } from './quote.js';
import type { NewsItem } from './news.js';

/** One trade: when (ms), at what price, how much. */
export interface Trade {
  time: number;
  price: number;
  volume: number;
}

// --- Connection ---

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface ConnectionInfo {
  state: ConnectionState;
  latency?: number;
  reconnectAttempt?: number;
  lastMessageTime?: number;
  error?: string;
}

// --- Ticks & Trades ---

export interface RawTick {
  time: number;
  price: number;
  volume: number;
  side?: 'buy' | 'sell';
  /** The best bid and ask with it, when the feed has them (the chart marks them). */
  bid?: number;
  ask?: number;
}

export interface AggregatedBar extends OHLCBar {
  /** True once the bar's interval is over and it no longer changes. */
  closed: boolean;
  /** How many ticks made the bar. */
  tickCount: number;
}

// --- Data Adapter (Strategy Pattern) ---

/**
 * What `adapter.connect(config)` is given. The chart's stream
 * (`connectStream`) passes `symbol` and `timeframe` only; the other fields
 * are for an adapter you connect yourself, and none of the built-in
 * adapters reads them. The stream reconnects by `StreamConfig.reconnect`.
 */
export interface DataAdapterConfig {
  symbol: string;
  timeframe: TimeFrame;
  /** Connect again when the connection drops. Not passed by the stream. */
  reconnect?: boolean;
  /** Tries before giving up. Not passed by the stream. */
  reconnectMaxRetries?: number;
  /** The wait before the first try, ms. Not passed by the stream. */
  reconnectBaseDelay?: number;
  /** The longest wait between tries, ms. Not passed by the stream. */
  reconnectMaxDelay?: number;
  /** How often to check the connection is alive, ms. Not passed by the stream. */
  heartbeatInterval?: number;
  /** The most ticks to keep while they can't be delivered. Not passed by the stream. */
  bufferSize?: number;
}

export type DataAdapterEventType =
  | 'tick'
  | 'bar'
  | 'barClose'
  /** The first bars, loaded at the start. */
  | 'snapshot'
  | 'connectionChange'
  | 'error'
  /**
   * The feed learned about the connected symbol after the chart asked
   * (`resolveSymbol`), for instance on its first message: `data` is the
   * `SymbolInfo`. The chart applies it (precision, price step, hours).
   */
  | 'symbolInfo';

export interface DataAdapterEvent<T = unknown> {
  type: DataAdapterEventType;
  data: T;
  timestamp: number;
}

export type DataAdapterListener<T = unknown> = (event: DataAdapterEvent<T>) => void;

/**
 * Data adapter interface. Implements the observer pattern:
 * - connect() to start receiving data
 * - on('bar'|'tick'|'connectionChange', handler) to receive events
 * - disconnect() to stop, then connect() again to switch symbols/timeframes
 * - No separate subscribe/unsubscribe — reconnect is the intended pattern
 *
 * Strategy pattern for pluggable data sources.
 * Implementations handle the specifics of each data source (WebSocket, REST,
 * SSE, etc.) while the StreamManager orchestrates lifecycle and aggregation.
 *
 * Built-in: BinanceAdapter
 * Implement this for: custom exchange APIs, broker feeds, mock data
 */
export interface DataAdapter {
  readonly name: string;

  /**
   * Optional: the timeframes the feed serves. Charts build any other
   * timeframe (7m, 90m, 2d…) from the coarsest of these that divides it.
   * Leave it out when the feed serves every timeframe.
   */
  readonly supportedTimeframes?: readonly TimeFrame[];

  connect(config: DataAdapterConfig): void;
  disconnect(): void;
  getConnectionState(): ConnectionState;

  /**
   * Load historical bars. Called once on connect, before streaming starts.
   * Returns bars sorted by time ascending.
   */
  fetchHistory(symbol: string, timeframe: TimeFrame, limit?: number): Promise<OHLCBar[]>;

  /**
   * Optional: load up to `limit` bars older than `before` (the oldest loaded
   * bar's time, in the bars' own unit), sorted by time ascending. Return an
   * empty array when no older data exists. A chart connected to an adapter
   * with this method loads older bars as the user scrolls back in time.
   */
  fetchHistoryBefore?(symbol: string, timeframe: TimeFrame, before: number, limit: number): Promise<OHLCBar[]>;

  /** Optional: symbols matching `query`, best first — for a symbol search box. */
  searchSymbols?(query: string, options?: SymbolSearchOptions): Promise<SymbolInfo[]>;

  /**
   * Optional: what the feed knows about `symbol` (name, price step, the
   * exchange's `timeZone` and hours), or null when it doesn't know it. A
   * connected chart asks for it and applies it.
   */
  resolveSymbol?(symbol: string): Promise<SymbolInfo | null>;

  /**
   * Optional: live quotes (last price, the day's change, high, low, volume)
   * for many symbols at once, until the function it returns is called. A
   * widget's watchlist fills its rows from it.
   */
  subscribeQuotes?(symbols: readonly string[], onQuotes: (quotes: Quote[]) => void): () => void;

  /** Optional: recent headlines about `symbol`, newest first. */
  fetchNews?(symbol: string, limit?: number): Promise<NewsItem[]>;

  /**
   * Optional, with `subscribeTrades`: up to `limit` recent trades, oldest
   * first. A chart builds tick timeframes (`'100T'`) from a feed's trades.
   */
  fetchTrades?(symbol: string, limit?: number): Promise<Trade[]>;

  /** Optional, with `fetchTrades`: live trades of `symbol` until the function it returns is called. */
  subscribeTrades?(symbol: string, onTrades: (trades: Trade[]) => void): () => void;

  on<T = unknown>(event: DataAdapterEventType, listener: DataAdapterListener<T>): void;
  off<T = unknown>(event: DataAdapterEventType, listener: DataAdapterListener<T>): void;

  dispose(): void;
}

// --- Stream Manager Config ---

export interface StreamConfig {
  adapter: DataAdapter;
  symbol: string;
  timeframe: TimeFrame;
  /** Bars to load at the start. Default 500. */
  historyLimit?: number;
  /** Bars per request when scrolling back for older bars (needs `adapter.fetchHistoryBefore`), default: 500. */
  historyPageSize?: number;
  /**
   * Follow a new bar while the view is at the newest one (a view scrolled
   * back stays). Sets `chart.setAutoScroll`. Default `true`.
   */
  autoScroll?: boolean;
  /** Not read: the stream leaves the last price's line as the chart shows it. */
  showCurrentPriceLine?: boolean;
  /** Build the bars from the feed's ticks instead of taking its bars. Default `false`. */
  aggregateTicks?: boolean;
  reconnect?: ReconnectConfig;
}

export interface ReconnectConfig {
  /** Connect again when the connection drops. Default `true`. */
  enabled: boolean;
  /** Tries before giving up. Default `Infinity`. */
  maxRetries: number;
  /** The wait before the first try, ms. Default 1000. */
  baseDelay: number;
  /** The longest wait between tries, ms, before a jitter of up to 25% either way. Default 30000. */
  maxDelay: number;
  /** Each wait is the last times this. Default 2. */
  backoffMultiplier: number;
}

export const DEFAULT_RECONNECT: ReconnectConfig = {
  enabled: true,
  maxRetries: Infinity,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
};

export const DEFAULT_STREAM_CONFIG: Partial<StreamConfig> = {
  historyLimit: 500,
  autoScroll: true,
  showCurrentPriceLine: true,
  aggregateTicks: false,
};
