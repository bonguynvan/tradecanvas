import type { OHLCBar, TimeFrame } from './ohlc.js';

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
 * DataAdapter interface — Strategy pattern for pluggable data sources.
 *
 * Implementations handle the specifics of each data source (WebSocket, REST,
 * SSE, etc.) while the StreamManager orchestrates lifecycle and aggregation.
 *
 * Built-in: BinanceAdapter
 * Implement this for: custom exchange APIs, broker feeds, mock data
 */
export interface DataAdapter {
  readonly name: string;

  connect(config: DataAdapterConfig): void;
  disconnect(): void;
  getConnectionState(): ConnectionState;

  /**
   * Load historical bars. Called once on connect, before streaming starts.
   * Returns bars sorted by time ascending.
   */
  fetchHistory(symbol: string, timeframe: TimeFrame, limit?: number): Promise<OHLCBar[]>;

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
