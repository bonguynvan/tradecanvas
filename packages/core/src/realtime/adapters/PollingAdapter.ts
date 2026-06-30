import type {
  DataAdapter,
  DataAdapterConfig,
  DataAdapterEventType,
  DataAdapterListener,
  ConnectionState,
  OHLCBar,
  TimeFrame,
} from '@tradecanvas/commons';

export interface PollingAdapterOptions {
  /** Adapter name, e.g. `'coinbase'`. */
  name: string;
  /** Fetch recent bars (ascending by time). Drives both history and polling. */
  fetchBars: (symbol: string, timeframe: TimeFrame, limit: number) => Promise<OHLCBar[]>;
  /** Poll interval in ms (default 5000). */
  intervalMs?: number;
  /** Bars to request each poll — ≥2 so a rollover's closing bar is included (default 2). */
  pollLimit?: number;
  /** History limit when `fetchHistory` is called without one (default 500). */
  defaultHistoryLimit?: number;
  /** Inject a timer (testing). Defaults to global `setInterval`/`clearInterval`. */
  setInterval?: (fn: () => void, ms: number) => unknown;
  clearInterval?: (handle: unknown) => void;
}

/**
 * REST polling `DataAdapter` base — for feeds without a WebSocket (most stock /
 * FX APIs). Polls `fetchBars` on an interval, emits the latest bar as forming,
 * and emits the prior bar as `closed` when the bucket rolls over.
 *
 * Generic use:
 * ```ts
 * new PollingAdapter({ name, fetchBars, intervalMs: 3000 })
 * ```
 * Built-in subclass: `CoinbaseAdapter`.
 */
export class PollingAdapter implements DataAdapter {
  readonly name: string;

  private state: ConnectionState = 'disconnected';
  private listeners = new Map<DataAdapterEventType, Set<DataAdapterListener>>();
  private config: DataAdapterConfig | null = null;
  private timer: unknown = null;
  private lastBarTime = 0;
  private readonly opts: PollingAdapterOptions;

  constructor(opts: PollingAdapterOptions) {
    this.opts = opts;
    this.name = opts.name;
  }

  connect(config: DataAdapterConfig): void {
    this.config = config;
    this.lastBarTime = 0;
    this.state = 'connected';
    this.emitEvent('connectionChange', 'connected');
    this.startPolling();
  }

  disconnect(): void {
    this.stopPolling();
    this.state = 'disconnected';
    this.emitEvent('connectionChange', 'disconnected');
  }

  getConnectionState(): ConnectionState {
    return this.state;
  }

  fetchHistory(symbol: string, timeframe: TimeFrame, limit?: number): Promise<OHLCBar[]> {
    return this.opts.fetchBars(symbol, timeframe, limit ?? this.opts.defaultHistoryLimit ?? 500);
  }

  on<T = unknown>(event: DataAdapterEventType, listener: DataAdapterListener<T>): void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener as DataAdapterListener);
  }

  off<T = unknown>(event: DataAdapterEventType, listener: DataAdapterListener<T>): void {
    this.listeners.get(event)?.delete(listener as DataAdapterListener);
  }

  dispose(): void {
    this.disconnect();
    this.listeners.clear();
  }

  /** Run one poll cycle. Public so callers (and tests) can pull on demand. */
  async poll(): Promise<void> {
    const cfg = this.config;
    if (!cfg || this.state !== 'connected') return;

    let bars: OHLCBar[];
    try {
      bars = await this.opts.fetchBars(cfg.symbol, cfg.timeframe, this.opts.pollLimit ?? 2);
    } catch (cause) {
      this.emitEvent('error', { message: 'Poll failed', cause });
      return;
    }
    if (bars.length === 0) return;

    const latest = bars[bars.length - 1];

    // Bucket rolled over: the previously-forming bar is now closed. Emit it
    // with its final values (present in this response when pollLimit ≥ 2).
    if (this.lastBarTime > 0 && latest.time > this.lastBarTime) {
      const closing = bars.find((b) => b.time === this.lastBarTime);
      if (closing) this.emitEvent('bar', { bar: closing, closed: true });
    }

    this.emitEvent('bar', { bar: latest, closed: false });
    this.emitEvent('tick', { time: Date.now(), price: latest.close, volume: latest.volume });
    this.lastBarTime = latest.time;
  }

  // --- internal ---

  private startPolling(): void {
    this.stopPolling();
    void this.poll();
    const setTimer = this.opts.setInterval ?? ((fn, ms) => setInterval(fn, ms));
    this.timer = setTimer(() => {
      void this.poll();
    }, this.opts.intervalMs ?? 5000);
  }

  private stopPolling(): void {
    if (this.timer !== null) {
      const clear =
        this.opts.clearInterval ?? ((h) => clearInterval(h as ReturnType<typeof setInterval>));
      clear(this.timer);
      this.timer = null;
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
