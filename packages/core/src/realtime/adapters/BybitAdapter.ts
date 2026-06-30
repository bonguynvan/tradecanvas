import type { OHLCBar, TimeFrame } from '@tradecanvas/commons';
import { WebSocketAdapter, type WsParseResult } from './WebSocketAdapter.js';
import { toFiniteNumber, isObject } from './parseUtils.js';

type BybitCategory = 'spot' | 'linear' | 'inverse';

const INTERVAL: Partial<Record<TimeFrame, string>> = {
  '1m': '1', '3m': '3', '5m': '5', '15m': '15', '30m': '30',
  '1h': '60', '2h': '120', '4h': '240', '6h': '360', '12h': '720',
  '1d': 'D', '1w': 'W', '1M': 'M',
};

/** Map a TimeFrame to a Bybit kline interval token, defaulting to `1`. */
export function bybitInterval(timeframe: TimeFrame): string {
  return INTERVAL[timeframe] ?? '1';
}

export interface BybitAdapterOptions {
  /** REST base, default `https://api.bybit.com`. */
  restBase?: string;
  /** WS base, default `wss://stream.bybit.com/v5/public/spot`. */
  wsBase?: string;
  /** Product category, default `spot`. */
  category?: BybitCategory;
}

/**
 * Bybit v5 adapter (no API key). WebSocket `kline` stream for live bars, REST
 * `/v5/market/kline` for history. Symbols use the `BTCUSDT` format.
 */
export class BybitAdapter extends WebSocketAdapter {
  constructor(options: BybitAdapterOptions = {}) {
    const restBase = options.restBase ?? 'https://api.bybit.com';
    const wsBase = options.wsBase ?? 'wss://stream.bybit.com/v5/public/spot';
    const category = options.category ?? 'spot';
    super({
      name: 'bybit',
      wsUrl: () => wsBase,
      subscribeMessage: (c) => ({ op: 'subscribe', args: [`kline.${bybitInterval(c.timeframe)}.${c.symbol}`] }),
      unsubscribeMessage: (c) => ({ op: 'unsubscribe', args: [`kline.${bybitInterval(c.timeframe)}.${c.symbol}`] }),
      parseMessage: parseBybitWsMessage,
      fetchHistory: (symbol, timeframe, limit) => fetchBybitKlines(restBase, category, symbol, timeframe, limit),
    });
  }
}

/** Parse a Bybit v5 kline push frame into the latest bar. */
export function parseBybitWsMessage(raw: unknown): WsParseResult | null {
  if (!isObject(raw)) return null;
  if (typeof raw.topic !== 'string' || !raw.topic.startsWith('kline.')) return null;
  const arr = raw.data;
  if (!Array.isArray(arr) || arr.length === 0) return null;

  const k = arr[arr.length - 1];
  if (!isObject(k)) return null;

  const time = toFiniteNumber(k.start);
  const open = toFiniteNumber(k.open);
  const high = toFiniteNumber(k.high);
  const low = toFiniteNumber(k.low);
  const close = toFiniteNumber(k.close);
  const volume = toFiniteNumber(k.volume);
  if (
    time === null || open === null || high === null ||
    low === null || close === null || volume === null
  ) {
    return null;
  }
  const closed = typeof k.confirm === 'boolean' ? k.confirm : false;
  return { bar: { time, open, high, low, close, volume }, closed };
}

export async function fetchBybitKlines(
  restBase: string,
  category: BybitCategory,
  symbol: string,
  timeframe: TimeFrame,
  limit: number,
): Promise<OHLCBar[]> {
  const interval = bybitInterval(timeframe);
  const capped = Math.min(Math.max(limit, 1), 1000);
  const url = `${restBase}/v5/market/kline?category=${category}&symbol=${symbol}&interval=${interval}&limit=${capped}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Bybit REST error: ${res.status}`);
  const json: unknown = await res.json();
  return parseBybitRestKlines(json);
}

/** Parse Bybit's `result.list` (descending) into ascending bars. */
export function parseBybitRestKlines(json: unknown): OHLCBar[] {
  if (!isObject(json) || !isObject(json.result)) return [];
  const list = json.result.list;
  if (!Array.isArray(list)) return [];
  const bars: OHLCBar[] = [];
  for (const row of list) {
    const bar = parseBybitRestRow(row);
    if (bar) bars.push(bar);
  }
  bars.sort((a, b) => a.time - b.time);
  return bars;
}

/** Bybit kline tuple: `[startTime(ms), open, high, low, close, volume, turnover]`. */
export function parseBybitRestRow(row: unknown): OHLCBar | null {
  if (!Array.isArray(row) || row.length < 6) return null;
  const time = toFiniteNumber(row[0]);
  const open = toFiniteNumber(row[1]);
  const high = toFiniteNumber(row[2]);
  const low = toFiniteNumber(row[3]);
  const close = toFiniteNumber(row[4]);
  const volume = toFiniteNumber(row[5]);
  if (
    time === null || open === null || high === null ||
    low === null || close === null || volume === null
  ) {
    return null;
  }
  return { time, open, high, low, close, volume };
}
