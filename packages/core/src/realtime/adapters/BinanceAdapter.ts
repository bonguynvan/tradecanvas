import type {
  DataAdapter,
  DataAdapterConfig,
  DataAdapterEventType,
  DataAdapterListener,
  ConnectionState,
  OHLCBar,
  SymbolInfo,
  SymbolSearchOptions,
  TimeFrame,
} from '@tradecanvas/commons';
import { rankSymbols, stepDecimals } from '@tradecanvas/commons';
import { parseRestKline, parseWsKline } from './binanceTypes.js';

const TF_MAP: Record<string, string> = {
  '1s': '1s', '1m': '1m', '3m': '3m', '5m': '5m', '15m': '15m', '30m': '30m',
  '1h': '1h', '2h': '2h', '4h': '4h', '6h': '6h', '8h': '8h', '12h': '12h',
  '1d': '1d', '3d': '3d', '1w': '1w', '1M': '1M',
};

/** Most klines one REST request returns. */
const MAX_KLINES = 1000;

/** Quote currencies most traded against, first: their pairs rank higher in a search. */
const QUOTE_RANK = ['USDT', 'USDC', 'FDUSD', 'BTC', 'ETH', 'BNB', 'EUR', 'TRY', 'BRL', 'JPY'];

function quoteBoost(info: SymbolInfo): number {
  const at = info.currency ? QUOTE_RANK.indexOf(info.currency) : -1;
  return at < 0 ? 0 : 40 - at * 3;
}

interface BinanceSymbol {
  symbol?: unknown;
  status?: unknown;
  baseAsset?: unknown;
  quoteAsset?: unknown;
  filters?: unknown;
}

/** A trading symbol from `exchangeInfo`, or null for one that isn't trading. */
function toSymbolInfo(raw: BinanceSymbol): SymbolInfo | null {
  if (typeof raw.symbol !== 'string' || raw.status !== 'TRADING') return null;
  const base = typeof raw.baseAsset === 'string' ? raw.baseAsset : '';
  const quote = typeof raw.quoteAsset === 'string' ? raw.quoteAsset : '';
  const priceFilter = Array.isArray(raw.filters)
    ? raw.filters.find((f): f is { tickSize: string } =>
      typeof f === 'object' && f !== null && (f as { filterType?: unknown }).filterType === 'PRICE_FILTER'
      && typeof (f as { tickSize?: unknown }).tickSize === 'string')
    : undefined;
  const info: SymbolInfo = {
    symbol: raw.symbol,
    description: base && quote ? `${base} / ${quote}` : raw.symbol,
    exchange: 'Binance',
    type: 'crypto',
  };
  if (priceFilter) {
    info.pricePrecision = stepDecimals(priceFilter.tickSize);
    info.minTick = Number(priceFilter.tickSize);
  }
  info.timezone = 'UTC';
  if (quote) info.currency = quote;
  return info;
}

function symbolsOf(body: unknown): SymbolInfo[] {
  const list = (body as { symbols?: unknown } | null)?.symbols;
  if (!Array.isArray(list)) return [];
  const out: SymbolInfo[] = [];
  for (const raw of list) {
    const info = toSymbolInfo(raw as BinanceSymbol);
    if (info) out.push(info);
  }
  return out;
}

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
  /** Binance's kline intervals; other timeframes are built from these. */
  readonly supportedTimeframes = Object.keys(TF_MAP) as TimeFrame[];

  private ws: WebSocket | null = null;
  private state: ConnectionState = 'disconnected';
  private listeners = new Map<DataAdapterEventType, Set<DataAdapterListener>>();
  private config: DataAdapterConfig | null = null;
  private restBase: string;
  private wsBase: string;
  /** Every trading symbol, loaded on the first search. */
  private symbolList: Promise<SymbolInfo[]> | null = null;

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
      // Detach every handler, not just onclose: closing a socket that is
      // still CONNECTING fires `error`, and the adapter is typically reused by
      // the next connection (symbol/timeframe switch) — a stale error or
      // message would land on that connection's listeners.
      const ws = this.ws;
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      ws.close();
      this.ws = null;
    }
    this.setState('disconnected');
  }

  getConnectionState(): ConnectionState {
    return this.state;
  }

  fetchHistory(symbol: string, timeframe: TimeFrame, limit = 500): Promise<OHLCBar[]> {
    return this.fetchKlines(symbol, timeframe, limit, '');
  }

  /** Trading symbols matching `query`, best first; the list loads once, on the first search. */
  async searchSymbols(query: string, options?: SymbolSearchOptions): Promise<SymbolInfo[]> {
    const list = await this.loadSymbols();
    return rankSymbols(list, query, options?.limit ?? 50, quoteBoost);
  }

  /** Name, price step and currency of one symbol, or null for one Binance doesn't trade. */
  async resolveSymbol(symbol: string): Promise<SymbolInfo | null> {
    if (this.symbolList) {
      const list = await this.symbolList.catch(() => null);
      const known = list?.find((s) => s.symbol === symbol);
      if (known) return known;
    }
    const res = await fetch(`${this.restBase}/exchangeInfo?symbol=${encodeURIComponent(symbol)}`);
    if (!res.ok) return null;
    return symbolsOf(await res.json())[0] ?? null;
  }

  private loadSymbols(): Promise<SymbolInfo[]> {
    if (!this.symbolList) {
      this.symbolList = (async () => {
        const res = await fetch(`${this.restBase}/exchangeInfo`);
        if (!res.ok) throw new Error(`Binance REST error: ${res.status}`);
        return symbolsOf(await res.json());
      })();
      // A failed load is tried again on the next search.
      this.symbolList.catch(() => { this.symbolList = null; });
    }
    return this.symbolList;
  }

  /** Up to `limit` klines (1000 at most) that open before `before` (ms). */
  fetchHistoryBefore(symbol: string, timeframe: TimeFrame, before: number, limit = 500): Promise<OHLCBar[]> {
    return this.fetchKlines(symbol, timeframe, Math.min(limit, MAX_KLINES), `&endTime=${Math.floor(before) - 1}`);
  }

  private async fetchKlines(symbol: string, timeframe: TimeFrame, limit: number, range: string): Promise<OHLCBar[]> {
    const interval = TF_MAP[timeframe] ?? '15m';
    const url = `${this.restBase}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}${range}`;
    const res = await fetch(url);

    if (!res.ok) throw new Error(`Binance REST error: ${res.status}`);

    const data: unknown = await res.json();
    if (!Array.isArray(data)) return [];
    const bars: OHLCBar[] = [];
    for (const raw of data) {
      const parsed = parseRestKline(raw);
      if (parsed) bars.push(parsed);
    }
    return bars;
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
      let msg: unknown;
      try {
        msg = JSON.parse(typeof event.data === 'string' ? event.data : '');
      } catch {
        return;
      }
      if (
        typeof msg === 'object' &&
        msg !== null &&
        (msg as { e?: unknown }).e === 'kline'
      ) {
        this.handleKline((msg as { k?: unknown }).k);
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

  private handleKline(k: unknown): void {
    const parsed = parseWsKline(k);
    if (!parsed) return;
    const { bar, closed } = parsed;

    this.emitEvent('bar', { bar, closed });
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
