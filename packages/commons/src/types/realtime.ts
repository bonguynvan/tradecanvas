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
  closed: boolean;       // true when bar is finalized
  tickCount: number;     // number of ticks in this bar
}

// --- Data Adapter (Strategy Pattern) ---

export interface DataAdapterConfig {
  symbol: string;
  timeframe: TimeFrame;
  reconnect?: boolean;          // default: true
  reconnectMaxRetries?: number; // default: Infinity
  reconnectBaseDelay?: number;  // ms, default: 1000
  reconnectMaxDelay?: number;   // ms, default: 30000
  heartbeatInterval?: number;   // ms, default: 30000
  bufferSize?: number;          // max ticks to buffer, default: 1000
}

export type DataAdapterEventType =
  | 'tick'
  | 'bar'
  | 'barClose'
  | 'snapshot'        // initial historical data loaded
  | 'connectionChange'
  | 'error';

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
   * Optional: what the feed knows about `symbol` (name, price step, exchange
   * timezone and hours), or null when it doesn't know it. A connected chart
   * asks for it and applies it.
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
  historyLimit?: number;        // bars to load initially, default: 500
  /** Bars per request when scrolling back for older bars (needs `adapter.fetchHistoryBefore`), default: 500. */
  historyPageSize?: number;
  autoScroll?: boolean;         // scroll to end on new bar, default: true
  showCurrentPriceLine?: boolean; // default: true
  aggregateTicks?: boolean;     // build bars from ticks, default: false
  reconnect?: ReconnectConfig;
}

export interface ReconnectConfig {
  enabled: boolean;             // default: true
  maxRetries: number;           // default: Infinity
  baseDelay: number;            // ms, default: 1000
  maxDelay: number;             // ms, default: 30000
  backoffMultiplier: number;    // default: 2
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
