import type {
  StreamConfig,
  ConnectionState,
  ConnectionInfo,
  DataAdapter,
  DataAdapterEventType,
  OHLCBar,
  RawTick,
  AggregatedBar,
  TimeFrame,
} from '@chart-lib/commons';
import { DEFAULT_STREAM_CONFIG, DEFAULT_RECONNECT } from '@chart-lib/commons';
import { Emitter } from './Emitter.js';
import { TickAggregator } from './TickAggregator.js';
import { ReconnectManager } from './ReconnectManager.js';
import { CurrentPriceLine } from './CurrentPriceLine.js';

export interface StreamEvents {
  /** Historical data loaded */
  snapshot: OHLCBar[];
  /** New closed bar appended */
  barClose: AggregatedBar;
  /** Current forming bar updated */
  barUpdate: AggregatedBar;
  /** Raw tick received */
  tick: RawTick;
  /** Current price changed */
  priceChange: { price: number; previousClose: number | null };
  /** Connection state changed */
  connectionChange: ConnectionInfo;
  /** Error occurred */
  error: { message: string; code?: string };
}

/**
 * StreamManager — orchestrates data flow from adapter to chart.
 *
 * Responsibilities:
 * 1. Manages adapter lifecycle (connect, disconnect, reconnect)
 * 2. Loads historical data on connect
 * 3. Routes incoming data through TickAggregator
 * 4. Maintains current price for the price line
 * 5. Provides clean event interface for the Chart class
 *
 * Usage:
 *   const stream = new StreamManager();
 *   stream.on('snapshot', (bars) => chart.setData(bars));
 *   stream.on('barClose', (bar) => chart.appendBar(bar));
 *   stream.on('barUpdate', (bar) => chart.updateLastBar(bar));
 *   stream.connect({ adapter, symbol: 'BTCUSDT', timeframe: '1m' });
 */
export class StreamManager extends Emitter<StreamEvents> {
  private config: StreamConfig | null = null;
  private adapter: DataAdapter | null = null;
  private aggregator: TickAggregator | null = null;
  private reconnector: ReconnectManager;
  readonly priceLine = new CurrentPriceLine();

  private state: ConnectionState = 'disconnected';
  private lastPrice: number | null = null;
  private previousClose: number | null = null;
  private unsubscribers: (() => void)[] = [];
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private lastMessageTime = 0;

  constructor() {
    super();
    this.reconnector = new ReconnectManager();
    this.wireReconnector();
  }

  // --- Public API ---

  async connect(config: StreamConfig): Promise<void> {
    // Clean up previous connection
    this.disconnect();

    this.config = { ...DEFAULT_STREAM_CONFIG, ...config } as StreamConfig;
    this.adapter = config.adapter;
    this.aggregator = new TickAggregator(config.timeframe);

    // Replace reconnector — clean up old listeners first
    this.reconnector.removeAllListeners();
    this.reconnector.stop();
    this.reconnector = new ReconnectManager(config.reconnect ?? DEFAULT_RECONNECT);
    this.wireReconnector();

    // Wire aggregator events -> stream events
    this.aggregator.on('bar', (bar) => {
      this.emit('barUpdate', bar);
      this.updatePrice(bar.close);
    });
    this.aggregator.on('barClose', (bar) => {
      this.previousClose = bar.close;
      this.emit('barClose', bar);
    });

    // Wire adapter events
    this.wireAdapter();

    // Start connection
    this.reconnector.start();
    await this.doConnect();
  }

  disconnect(): void {
    this.reconnector.stop();
    this.stopHeartbeat();

    for (const unsub of this.unsubscribers) unsub();
    this.unsubscribers = [];

    if (this.adapter) {
      this.adapter.disconnect();
      this.adapter = null;
    }

    this.aggregator?.reset();
    this.aggregator?.removeAllListeners();
    this.aggregator = null;
    this.config = null;
    this.lastPrice = null;
    this.previousClose = null;

    this.setState('disconnected');
  }

  /**
   * Switch symbol or timeframe without full teardown.
   * Reloads history and restarts streaming.
   */
  async switchTo(symbol: string, timeframe: TimeFrame): Promise<void> {
    if (!this.config || !this.adapter) return;

    this.adapter.disconnect();
    this.aggregator?.reset();
    this.aggregator?.setTimeframe(timeframe);
    this.lastPrice = null;
    this.previousClose = null;

    this.config.symbol = symbol;
    this.config.timeframe = timeframe;

    await this.doConnect();
  }

  getConnectionState(): ConnectionState {
    return this.state;
  }

  getConnectionInfo(): ConnectionInfo {
    return {
      state: this.state,
      reconnectAttempt: this.reconnector.getAttempt(),
      lastMessageTime: this.lastMessageTime,
    };
  }

  getLastPrice(): number | null {
    return this.lastPrice;
  }

  // --- Internal ---

  private async doConnect(): Promise<void> {
    if (!this.config || !this.adapter) return;

    this.setState('connecting');

    try {
      // 1. Load historical data
      const history = await this.adapter.fetchHistory(
        this.config.symbol,
        this.config.timeframe,
        this.config.historyLimit ?? 500,
      );

      if (history.length > 0) {
        this.previousClose = history[history.length - 1].close;
        this.updatePrice(history[history.length - 1].close);
      }

      this.emit('snapshot', history);

      // 2. Start streaming
      this.adapter.connect({
        symbol: this.config.symbol,
        timeframe: this.config.timeframe,
      });

      this.startHeartbeat();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.emit('error', { message, code: 'CONNECT_FAILED' });
      this.setState('error');
      this.reconnector.schedule(() => this.doConnect());
    }
  }

  private wireReconnector(): void {
    this.reconnector.on('attempt', ({ attempt, delay }) => {
      this.setState('reconnecting');
      this.emit('connectionChange', {
        state: 'reconnecting',
        reconnectAttempt: attempt,
        lastMessageTime: this.lastMessageTime,
      });
    });
    this.reconnector.on('giveUp', ({ attempts }) => {
      this.setState('error');
      this.emit('error', { message: `Reconnection failed after ${attempts} attempts`, code: 'RECONNECT_EXHAUSTED' });
    });
  }

  private wireAdapter(): void {
    if (!this.adapter) return;

    // Connection state changes
    this.adapter.on('connectionChange', ((e: any) => {
      const newState = e.data as ConnectionState;
      this.lastMessageTime = Date.now();

      if (newState === 'connected') {
        this.reconnector.onConnected();
        this.setState('connected');
      } else if (newState === 'disconnected' || newState === 'error') {
        this.reconnector.schedule(() => this.doConnect());
      }
    }) as any);

    // Tick data
    this.adapter.on('tick', ((e: any) => {
      this.lastMessageTime = Date.now();
      const tick = e.data as RawTick;
      this.emit('tick', tick);

      if (this.config?.aggregateTicks && this.aggregator) {
        this.aggregator.processTick(tick);
      } else {
        this.updatePrice(tick.price);
      }
    }) as any);

    // Pre-formed bar data (most adapters provide this)
    this.adapter.on('bar', ((e: any) => {
      this.lastMessageTime = Date.now();
      const { bar, closed } = e.data as { bar: OHLCBar; closed: boolean };

      if (this.aggregator) {
        this.aggregator.processBar(bar, closed);
      }
    }) as any);

    // Error
    this.adapter.on('error', ((e: any) => {
      this.emit('error', { message: e.data?.message ?? 'Adapter error' });
    }) as any);
  }

  private updatePrice(price: number): void {
    if (price !== this.lastPrice) {
      this.lastPrice = price;
      this.priceLine.setPrice(price, this.previousClose ?? undefined);
      this.emit('priceChange', { price, previousClose: this.previousClose });
    }
  }

  private setState(state: ConnectionState): void {
    if (this.state === state) return;
    this.state = state;
    this.emit('connectionChange', {
      state,
      reconnectAttempt: this.reconnector.getAttempt(),
      lastMessageTime: this.lastMessageTime,
    });
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      const stale = Date.now() - this.lastMessageTime > 60000;
      if (stale && this.state === 'connected') {
        this.emit('error', { message: 'Heartbeat timeout', code: 'HEARTBEAT_TIMEOUT' });
        this.adapter?.disconnect();
        this.reconnector.schedule(() => this.doConnect());
      }
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  dispose(): void {
    this.disconnect();
    this.removeAllListeners();
  }
}
