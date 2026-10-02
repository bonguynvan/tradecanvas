import type {
  DataAdapter,
  DataAdapterConfig,
  DataAdapterEventType,
  DataAdapterListener,
  ConnectionState,
  OHLCBar,
  TimeFrame,
} from '@tradecanvas/commons';
import { timeframeToMs } from '@tradecanvas/commons';

export interface MockAdapterOptions {
  /** Base price to generate data around */
  basePrice?: number;
  /** Volatility as percentage (default: 1.5) */
  volatility?: number;
  /** Tick interval in ms (default: 2000) */
  tickInterval?: number;
  /** Number of historical bars to generate */
  historySize?: number;
  /** Custom history generator */
  historyGenerator?: (symbol: string, timeframe: TimeFrame, limit: number) => OHLCBar[];
}

/**
 * Mock data adapter for testing, demos, and markets without free APIs.
 *
 * Generates realistic OHLCV data with configurable volatility.
 * Useful for:
 * - Unit/integration testing
 * - VN stock market simulation
 * - Offline development
 */
export class MockAdapter implements DataAdapter {
  readonly name = 'mock';

  private state: ConnectionState = 'disconnected';
  private listeners = new Map<DataAdapterEventType, Set<DataAdapterListener>>();
  private config: DataAdapterConfig | null = null;
  private options: MockAdapterOptions;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private currentPrice: number;
  /** Open of the oldest bar handed out per symbol, where its next older page ends. */
  private oldestOpen = new Map<string, number>();

  constructor(options?: MockAdapterOptions) {
    this.options = {
      basePrice: 100,
      volatility: 1.5,
      tickInterval: 2000,
      historySize: 500,
      ...options,
    };
    this.currentPrice = this.options.basePrice!;
  }

  connect(config: DataAdapterConfig): void {
    this.config = config;
    this.state = 'connected';
    this.emitEvent('connectionChange', 'connected');
    this.startTicking();
  }

  disconnect(): void {
    this.stopTicking();
    this.state = 'disconnected';
    this.emitEvent('connectionChange', 'disconnected');
  }

  getConnectionState(): ConnectionState {
    return this.state;
  }

  async fetchHistory(symbol: string, timeframe: TimeFrame, limit?: number): Promise<OHLCBar[]> {
    const bars = this.options.historyGenerator
      ? this.options.historyGenerator(symbol, timeframe, limit ?? this.options.historySize!)
      : this.generateHistory(timeframe, limit ?? this.options.historySize!);
    if (bars.length > 0) this.oldestOpen.set(symbol, bars[0].open);
    return bars;
  }

  /** Make up `limit` bars before `before` (ms) that lead into the oldest bar handed out. */
  async fetchHistoryBefore(symbol: string, timeframe: TimeFrame, before: number, limit: number): Promise<OHLCBar[]> {
    const intervalMs = timeframeToMs(timeframe);
    const vol = this.options.volatility! / 100;
    const bars: OHLCBar[] = new Array(Math.max(0, limit));
    let close = this.oldestOpen.get(symbol) ?? this.options.basePrice!;
    // Walk back in time: each bar's close is the next one's open.
    for (let k = 0; k < limit; k++) {
      const open = close / (1 + (Math.random() - 0.52) * vol);
      const high = Math.max(open, close) + Math.random() * close * vol * 0.3;
      const low = Math.max(0, Math.min(open, close) - Math.random() * close * vol * 0.3);
      const volume = Math.floor(10000 + Math.random() * 100000);
      bars[limit - 1 - k] = { time: before - (k + 1) * intervalMs, open, high, low, close, volume };
      close = open;
    }
    this.oldestOpen.set(symbol, close);
    return bars;
  }

  on<T = unknown>(event: DataAdapterEventType, listener: DataAdapterListener<T>): void {
    let set = this.listeners.get(event);
    if (!set) { set = new Set(); this.listeners.set(event, set); }
    set.add(listener as DataAdapterListener);
  }

  off<T = unknown>(event: DataAdapterEventType, listener: DataAdapterListener<T>): void {
    this.listeners.get(event)?.delete(listener as DataAdapterListener);
  }

  dispose(): void {
    this.disconnect();
    this.listeners.clear();
  }

  // --- Internal ---

  private generateHistory(timeframe: TimeFrame, count: number): OHLCBar[] {
    const bars: OHLCBar[] = [];
    const now = Date.now();
    const intervalMs = timeframeToMs(timeframe);
    let price = this.options.basePrice!;
    const vol = this.options.volatility! / 100;

    for (let i = count - 1; i >= 0; i--) {
      const time = now - i * intervalMs;
      const change = (Math.random() - 0.48) * price * vol;
      const open = price;
      price += change;
      const high = Math.max(open, price) + Math.random() * price * vol * 0.3;
      const low = Math.min(open, price) - Math.random() * price * vol * 0.3;
      const volume = Math.floor(10000 + Math.random() * 100000);
      bars.push({ time, open, high, low, close: price, volume });
    }

    this.currentPrice = price;
    return bars;
  }

  private startTicking(): void {
    this.stopTicking();
    const interval = this.options.tickInterval ?? 2000;

    this.tickTimer = setInterval(() => {
      if (this.state !== 'connected' || !this.config) return;

      const vol = this.options.volatility! / 100;
      const change = (Math.random() - 0.48) * this.currentPrice * vol * 0.3;
      this.currentPrice += change;

      const now = Date.now();
      const intervalMs = timeframeToMs(this.config.timeframe);
      const barTime = Math.floor(now / intervalMs) * intervalMs;

      const bar: OHLCBar = {
        time: barTime,
        open: this.currentPrice - change,
        high: Math.max(this.currentPrice, this.currentPrice - change) + Math.abs(change) * 0.2,
        low: Math.min(this.currentPrice, this.currentPrice - change) - Math.abs(change) * 0.2,
        close: this.currentPrice,
        volume: Math.floor(100 + Math.random() * 5000),
      };

      // Check if bar closed (crossed timeframe boundary)
      const closed = false; // In mock, we mostly send forming bars

      this.emitEvent('bar', { bar, closed });
      this.emitEvent('tick', { time: now, price: this.currentPrice, volume: bar.volume });
    }, interval);
  }

  private stopTicking(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  private emitEvent(type: DataAdapterEventType, data: unknown): void {
    const set = this.listeners.get(type);
    if (set) {
      const event = { type, data, timestamp: Date.now() };
      for (const listener of set) listener(event);
    }
  }
}
