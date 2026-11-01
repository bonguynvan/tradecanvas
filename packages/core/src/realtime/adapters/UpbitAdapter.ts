import type { OHLCBar, TimeFrame } from '@tradecanvas/commons';
import { WebSocketAdapter, type WebSocketFactory, type WebSocketLike, type WsParseResult } from './WebSocketAdapter.js';
import { toFiniteNumber, isObject } from './parseUtils.js';

/** The most candles one REST call returns. */
export const UPBIT_MAX_CANDLES = 200;

/** REST candle paths, after `/v1/candles/`. */
const CANDLE_PATH: Partial<Record<TimeFrame, string>> = {
  '1m': 'minutes/1', '3m': 'minutes/3', '5m': 'minutes/5', '15m': 'minutes/15', '30m': 'minutes/30',
  '1h': 'minutes/60', '4h': 'minutes/240',
  '1d': 'days', '1w': 'weeks', '1M': 'months',
};

/** WebSocket streams: candles up to four hours; the day is read off the ticker. */
const STREAM_TYPE: Partial<Record<TimeFrame, string>> = {
  '1m': 'candle.1m', '3m': 'candle.3m', '5m': 'candle.5m', '15m': 'candle.15m', '30m': 'candle.30m',
  '1h': 'candle.60m', '4h': 'candle.240m',
  '1d': 'ticker',
};

/** The REST candle path of `timeframe`, or null when Upbit has none. */
export function upbitCandlePath(timeframe: TimeFrame): string | null {
  return CANDLE_PATH[timeframe] ?? null;
}

/** The WebSocket stream of `timeframe`, or null when Upbit streams none. */
export function upbitStreamType(timeframe: TimeFrame): string | null {
  return STREAM_TYPE[timeframe] ?? null;
}

export interface UpbitAdapterOptions {
  /**
   * REST base, default `https://api.upbit.com`. Upbit allows a browser (a
   * request with an `Origin`) one call in ten seconds, so a web page points
   * this at a proxy of its own.
   */
  restBase?: string;
  /** WebSocket URL, default `wss://api.upbit.com/websocket/v1`. */
  wsUrl?: string;
  /** A WebSocket implementation (default: the global `WebSocket`, reading binary frames as an `ArrayBuffer`). */
  socketFactory?: WebSocketFactory;
}

/**
 * Upbit adapter (no API key). WebSocket candles for live bars (the ticker for
 * the day, which starts at 00:00 UTC, 09:00 in Korea), REST
 * `/v1/candles` for history, 200 bars a call. Symbols are Upbit's markets:
 * `KRW-BTC`, `BTC-ETH`, `USDT-BTC`. Pair it with `MARKET_UPBIT_KRW` for the
 * KRW market's steps and colours. Upbit closes a connection quiet for two
 * minutes; the chart's stream then reconnects. Upbit's data is its own: its
 * Open API terms apply to what you build on it.
 */
export class UpbitAdapter extends WebSocketAdapter {
  constructor(options: UpbitAdapterOptions = {}) {
    const restBase = options.restBase ?? 'https://api.upbit.com';
    const wsUrl = options.wsUrl ?? 'wss://api.upbit.com/websocket/v1';
    super({
      name: 'upbit',
      wsUrl: () => wsUrl,
      socketFactory: options.socketFactory ?? binarySocket,
      decode: decodeUpbitFrame,
      // One request per connection: the ticket, the stream, the format.
      subscribeMessage: (c) => [
        { ticket: 'tradecanvas' },
        { type: upbitStreamType(c.timeframe) ?? 'candle.1m', codes: [c.symbol] },
        { format: 'DEFAULT' },
      ],
      supportedTimeframes: Object.keys(STREAM_TYPE) as TimeFrame[],
      parseMessage: parseUpbitWsMessage,
      fetchHistory: (symbol, timeframe, limit) => fetchUpbitCandles(restBase, symbol, timeframe, limit),
      fetchHistoryBefore: (symbol, timeframe, before, limit) => fetchUpbitCandles(restBase, symbol, timeframe, limit, before),
    });
  }
}

/** The global WebSocket, reading binary frames (Upbit sends its JSON as bytes) as an `ArrayBuffer`. */
function binarySocket(url: string): WebSocketLike {
  const Ctor = (globalThis as { WebSocket?: new (url: string) => WebSocketLike & { binaryType?: string } }).WebSocket;
  if (!Ctor) throw new Error('No WebSocket implementation available');
  const socket = new Ctor(url);
  socket.binaryType = 'arraybuffer';
  return socket;
}

/** Made on the first binary frame, so loading the library needs no `TextDecoder`. */
let utf8: TextDecoder | null = null;

/** A frame's JSON, sent as text or as UTF-8 bytes; undefined when it is neither. */
export function decodeUpbitFrame(data: unknown): unknown {
  if (typeof data === 'string') return JSON.parse(data);
  if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) return JSON.parse((utf8 ??= new TextDecoder()).decode(data));
  return undefined;
}

/** A streamed candle as the forming bar, or the ticker as the day's. */
export function parseUpbitWsMessage(raw: unknown): WsParseResult | null {
  if (!isObject(raw) || typeof raw.type !== 'string') return null;
  if (raw.type.startsWith('candle.')) {
    const bar = barOf(raw, raw.candle_date_time_utc, raw.candle_acc_trade_volume);
    return bar ? { bar, closed: false } : null;
  }
  if (raw.type === 'ticker' && typeof raw.trade_date === 'string' && /^\d{8}$/.test(raw.trade_date)) {
    const d = raw.trade_date;
    const day = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T00:00:00`;
    const bar = barOf(raw, day, raw.acc_trade_volume);
    return bar ? { bar, closed: false } : null;
  }
  return null;
}

/** REST candles (newest first) as ascending bars; none for an error reply. */
export function parseUpbitRestCandles(json: unknown): OHLCBar[] {
  if (!Array.isArray(json)) return [];
  const bars: OHLCBar[] = [];
  for (const row of json) {
    const bar = isObject(row) ? barOf(row, row.candle_date_time_utc, row.candle_acc_trade_volume) : null;
    if (bar) bars.push(bar);
  }
  bars.sort((a, b) => a.time - b.time);
  return bars;
}

/** A bar from Upbit's price fields, starting at `utc` (`yyyy-MM-ddTHH:mm:ss`, no zone). */
function barOf(row: Record<string, unknown>, utc: unknown, volumeField: unknown): OHLCBar | null {
  const time = typeof utc === 'string' ? Date.parse(`${utc}Z`) : NaN;
  const open = toFiniteNumber(row.opening_price);
  const high = toFiniteNumber(row.high_price);
  const low = toFiniteNumber(row.low_price);
  const close = toFiniteNumber(row.trade_price);
  const volume = toFiniteNumber(volumeField);
  if (!Number.isFinite(time) || open === null || high === null || low === null || close === null || volume === null) return null;
  return { time, open, high, low, close, volume };
}

/**
 * Up to 200 candles of `market`, ascending: the newest, or those before
 * `before` (ms). A period with no trades has no candle.
 */
export async function fetchUpbitCandles(
  restBase: string,
  market: string,
  timeframe: TimeFrame,
  limit: number,
  before?: number,
): Promise<OHLCBar[]> {
  const path = upbitCandlePath(timeframe);
  if (!path) throw new Error(`Upbit has no ${timeframe} candles`);
  const count = Math.min(Math.max(Math.floor(limit), 1), UPBIT_MAX_CANDLES);
  const params = new URLSearchParams({ market, count: String(count) });
  if (before !== undefined) params.set('to', new Date(before).toISOString().replace(/\.\d{3}Z$/, 'Z'));
  const res = await fetch(`${restBase}/v1/candles/${path}?${params}`);
  if (!res.ok) throw new Error(`Upbit REST error: ${res.status}`);
  return parseUpbitRestCandles(await res.json());
}
