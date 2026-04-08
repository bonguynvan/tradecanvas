import type {
  DataAdapter,
  DataAdapterConfig,
  DataAdapterEventType,
  DataAdapterListener,
  ConnectionState,
  OHLCBar,
  TimeFrame,
} from '@chart-lib/commons';

const TF_MAP: Record<string, string> = {
  '1s': '1s', '1m': '1m', '3m': '3m', '5m': '5m', '15m': '15m', '30m': '30m',
  '1h': '1h', '2h': '2h', '4h': '4h', '6h': '6h', '8h': '8h', '12h': '12h',
  '1d': '1d', '3d': '3d', '1w': '1w', '1M': '1M',
};

/**
 * Binance public API adapter (no API key required).
 *
 * Supports:
 * - REST klines for historical data
 * - WebSocket kline stream for real-time data
 * - Auto-reconnection via the StreamManager
 *
 * Usage:
 *   const adapter = new BinanceAdapter();
 *   const stream = new StreamManager();
 *   stream.connect({ adapter, symbol: 'BTCUSDT', timeframe: '1m' });
 */
export class BinanceAdapter implements DataAdapter {
  readonly name = 'binance';

  private ws: WebSocket | null = null;
  private state: ConnectionState = 'disconnected';
  private listeners = new Map<DataAdapterEventType, Set<DataAdapterListener>>();
  private config: DataAdapterConfig | null = null;
  private restBase: string;
  private wsBase: string;

  constructor(options?: { restBase?: string; wsBase?: string }) {
    this.restBase = options?.restBase ?? 'https://api.binance.com/api/v3';
    this.wsBase = options?.wsBase ?? 'wss://stream.binance.com:9443/ws';
  }

  // --- DataAdapter interface ---

  connect(config: DataAdapterConfig): void {
    this.config = config;
    this.connectWs();
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.onclose = null; // prevent reconnect trigger
      this.ws.close();
      this.ws = null;
    }
    this.setState('disconnected');
  }

  getConnectionState(): ConnectionState {
    return this.state;
  }

  async fetchHistory(symbol: string, timeframe: TimeFrame, limit = 500): Promise<OHLCBar[]> {
    const interval = TF_MAP[timeframe] ?? '15m';
    const url = `${this.restBase}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const res = await fetch(url);

    if (!res.ok) throw new Error(`Binance REST error: ${res.status}`);

    const data = await res.json();
    return data.map((k: any[]) => ({
      time: k[0] as number,
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));
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

  // --- Internal ---

  private connectWs(): void {
    if (!this.config) return;

    const symbol = this.config.symbol.toLowerCase();
    const interval = TF_MAP[this.config.timeframe] ?? '15m';
    const stream = `${symbol}@kline_${interval}`;
    const url = `${this.wsBase}/${stream}`;

    this.setState('connecting');

    try {
      this.ws = new WebSocket(url);
    } catch {
      this.setState('error');
      this.emitEvent('error', { message: 'WebSocket creation failed' });
      this.emitEvent('connectionChange', 'error');
      return;
    }

    this.ws.onopen = () => {
      this.setState('connected');
      this.emitEvent('connectionChange', 'connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.e === 'kline') {
          this.handleKline(msg.k);
        }
      } catch {
        // Ignore malformed messages
      }
    };

    this.ws.onerror = () => {
      this.setState('error');
      this.emitEvent('error', { message: 'WebSocket error' });
    };

    this.ws.onclose = () => {
      this.setState('disconnected');
      this.emitEvent('connectionChange', 'disconnected');
    };
  }

  private handleKline(k: any): void {
    const bar: OHLCBar = {
      time: k.t,
      open: parseFloat(k.o),
      high: parseFloat(k.h),
      low: parseFloat(k.l),
      close: parseFloat(k.c),
      volume: parseFloat(k.v),
    };

    const closed = k.x as boolean;

    // Emit as bar event (StreamManager routes to aggregator)
    this.emitEvent('bar', { bar, closed });

    // Also emit as tick for tick-level consumers
    this.emitEvent('tick', {
      time: Date.now(),
      price: bar.close,
      volume: bar.volume,
    });
  }

  private setState(state: ConnectionState): void {
    this.state = state;
  }

  private emitEvent(type: DataAdapterEventType, data: unknown): void {
    const set = this.listeners.get(type);
    if (set) {
      const event = { type, data, timestamp: Date.now() };
      for (const listener of set) {
        listener(event);
      }
    }
  }
}
