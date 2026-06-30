import type {
  DataAdapter,
  DataAdapterConfig,
  DataAdapterEventType,
  DataAdapterListener,
  ConnectionState,
  OHLCBar,
  RawTick,
  TimeFrame,
} from '@tradecanvas/commons';

/** Minimal structural subset of the browser WebSocket this base depends on. */
export interface WebSocketLike {
  onopen: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  onclose: ((ev: unknown) => void) | null;
  send(data: string): void;
  close(): void;
}

export type WebSocketFactory = (url: string) => WebSocketLike;

/** What `parseMessage` extracts from a raw WS frame. */
export interface WsParseResult {
  /** A bar update (forming or finalized). */
  bar?: OHLCBar;
  /** Whether `bar` is finalized (default false). */
  closed?: boolean;
  /** An explicit trade tick. When omitted but `bar` is present, a tick is
   *  synthesized from the bar close (matches BinanceAdapter). */
  tick?: RawTick;
}

export interface WebSocketAdapterOptions {
  /** Adapter name, e.g. `'bybit'`. */
  name: string;
  /** Build the WS URL for a connection. */
  wsUrl: (config: DataAdapterConfig) => string;
  /** Fetch historical bars (REST), ascending by time. */
  fetchHistory: (symbol: string, timeframe: TimeFrame, limit: number) => Promise<OHLCBar[]>;
  /** Decode a raw frame into a bar/tick; return null/undefined to ignore. */
  parseMessage: (raw: unknown, config: DataAdapterConfig) => WsParseResult | null | undefined;
  /** Message(s) to send on open to subscribe (sent as JSON unless a string). */
  subscribeMessage?: (config: DataAdapterConfig) => unknown;
  /** Message(s) to send before close to unsubscribe. */
  unsubscribeMessage?: (config: DataAdapterConfig) => unknown;
  /** Decode raw frame data before `parseMessage` (default: `JSON.parse` of a string). */
  decode?: (data: unknown) => unknown;
  /** Inject a WebSocket implementation (default: global `WebSocket`). */
  socketFactory?: WebSocketFactory;
  /** History limit when `fetchHistory` is called without one (default 500). */
  defaultHistoryLimit?: number;
}

/**
 * Configurable WebSocket `DataAdapter` base. Factors out connection lifecycle,
 * subscribe/unsubscribe, event emission, decoding, and history fetch so a
 * concrete adapter is just URLs plus a parse function. Reconnection is
 * orchestrated by `StreamManager` (the adapter only reports `connectionChange`),
 * matching `BinanceAdapter`.
 *
 * Generic use:
 * ```ts
 * new WebSocketAdapter({ name, wsUrl, fetchHistory, parseMessage })
 * ```
 * Built-in subclasses: `BybitAdapter`, `KrakenAdapter`.
 */
export class WebSocketAdapter implements DataAdapter {
  readonly name: string;

  protected ws: WebSocketLike | null = null;
  protected state: ConnectionState = 'disconnected';
  protected config: DataAdapterConfig | null = null;

  private listeners = new Map<DataAdapterEventType, Set<DataAdapterListener>>();
  private readonly opts: WebSocketAdapterOptions;

  constructor(opts: WebSocketAdapterOptions) {
    this.opts = opts;
    this.name = opts.name;
  }

  connect(config: DataAdapterConfig): void {
    this.config = config;
    this.openSocket();
  }

  disconnect(): void {
    const cfg = this.config;
    if (this.ws) {
      if (this.opts.unsubscribeMessage && cfg) {
        try {
          this.sendMessage(this.opts.unsubscribeMessage(cfg));
        } catch {
          // best-effort unsubscribe during teardown
        }
      }
      this.ws.onclose = null; // prevent reconnect trigger (matches BinanceAdapter)
      this.ws.close();
      this.ws = null;
    }
    this.setState('disconnected');
  }

  getConnectionState(): ConnectionState {
    return this.state;
  }

  fetchHistory(symbol: string, timeframe: TimeFrame, limit?: number): Promise<OHLCBar[]> {
    return this.opts.fetchHistory(symbol, timeframe, limit ?? this.opts.defaultHistoryLimit ?? 500);
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

  // --- internal ---

  private openSocket(): void {
    const cfg = this.config;
    if (!cfg) return;

    const url = this.opts.wsUrl(cfg);
    this.setState('connecting');

    let socket: WebSocketLike;
    try {
      socket = this.createSocket(url);
    } catch {
      this.setState('error');
      this.emitEvent('error', { message: 'WebSocket creation failed' });
      this.emitEvent('connectionChange', 'error');
      return;
    }
    this.ws = socket;

    socket.onopen = () => {
      this.setState('connected');
      this.emitEvent('connectionChange', 'connected');
      if (this.opts.subscribeMessage) {
        try {
          this.sendMessage(this.opts.subscribeMessage(cfg));
        } catch {
          // ignore subscribe send failure; StreamManager will surface a stall
        }
      }
    };

    socket.onmessage = (event) => {
      const decoded = this.decode(event.data);
      if (decoded === undefined) return;

      let result: WsParseResult | null | undefined;
      try {
        result = this.opts.parseMessage(decoded, cfg);
      } catch {
        return;
      }
      if (!result) return;

      if (result.bar) {
        this.emitEvent('bar', { bar: result.bar, closed: result.closed ?? false });
      }
      if (result.tick) {
        this.emitEvent('tick', result.tick);
      } else if (result.bar) {
        this.emitEvent('tick', {
          time: Date.now(),
          price: result.bar.close,
          volume: result.bar.volume,
        });
      }
    };

    socket.onerror = () => {
      this.setState('error');
      this.emitEvent('error', { message: 'WebSocket error' });
    };

    socket.onclose = () => {
      this.setState('disconnected');
      this.emitEvent('connectionChange', 'disconnected');
    };
  }

  private sendMessage(msg: unknown): void {
    if (msg === undefined || !this.ws) return;
    this.ws.send(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }

  private decode(data: unknown): unknown {
    if (this.opts.decode) {
      try {
        return this.opts.decode(data);
      } catch {
        return undefined;
      }
    }
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return undefined;
      }
    }
    return data;
  }

  private createSocket(url: string): WebSocketLike {
    if (this.opts.socketFactory) return this.opts.socketFactory(url);
    const Ctor = (globalThis as { WebSocket?: new (url: string) => WebSocketLike }).WebSocket;
    if (!Ctor) throw new Error('No WebSocket implementation available');
    return new Ctor(url);
  }

  protected setState(state: ConnectionState): void {
    this.state = state;
  }

  protected emitEvent(type: DataAdapterEventType, data: unknown): void {
    const set = this.listeners.get(type);
    if (set) {
      const event = { type, data, timestamp: Date.now() };
      for (const listener of set) listener(event);
    }
  }
}
