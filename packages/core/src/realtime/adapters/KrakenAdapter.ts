import type { OHLCBar, TimeFrame } from '@tradecanvas/commons';
import { WebSocketAdapter, type WsParseResult } from './WebSocketAdapter.js';
import { toFiniteNumber, isObject } from './parseUtils.js';

/** Kraken OHLC intervals are in minutes. */
const INTERVAL: Partial<Record<TimeFrame, number>> = {
  '1m': 1, '5m': 5, '15m': 15, '30m': 30,
  '1h': 60, '4h': 240, '1d': 1440, '1w': 10080,
};

/** Map a TimeFrame to a Kraken interval (minutes), defaulting to 1. */
export function krakenInterval(timeframe: TimeFrame): number {
  return INTERVAL[timeframe] ?? 1;
}

export interface KrakenAdapterOptions {
  /** REST base, default `https://api.kraken.com`. */
  restBase?: string;
  /** WS base (v2), default `wss://ws.kraken.com/v2`. */
  wsBase?: string;
}

/**
 * Kraken adapter (no API key). WebSocket v2 `ohlc` channel for live bars, REST
 * `/0/public/OHLC` for history. WS symbols use the `BTC/USD` format; the REST
 * `pair` is derived by stripping the slash (`BTCUSD`).
 */
export class KrakenAdapter extends WebSocketAdapter {
  constructor(options: KrakenAdapterOptions = {}) {
    const restBase = options.restBase ?? 'https://api.kraken.com';
    const wsBase = options.wsBase ?? 'wss://ws.kraken.com/v2';
    super({
      name: 'kraken',
      wsUrl: () => wsBase,
      subscribeMessage: (c) => ({
        method: 'subscribe',
        params: { channel: 'ohlc', symbol: [c.symbol], interval: krakenInterval(c.timeframe) },
      }),
      unsubscribeMessage: (c) => ({
        method: 'unsubscribe',
        params: { channel: 'ohlc', symbol: [c.symbol], interval: krakenInterval(c.timeframe) },
      }),
      parseMessage: parseKrakenWsMessage,
      fetchHistory: (symbol, timeframe) => fetchKrakenOhlc(restBase, symbol, timeframe),
    });
  }
}

/** Parse a Kraken v2 `ohlc` frame into the latest bar (OHLC are floats). */
export function parseKrakenWsMessage(raw: unknown): WsParseResult | null {
  if (!isObject(raw) || raw.channel !== 'ohlc') return null;
  const arr = raw.data;
  if (!Array.isArray(arr) || arr.length === 0) return null;

  const k = arr[arr.length - 1];
  if (!isObject(k)) return null;

  const open = toFiniteNumber(k.open);
  const high = toFiniteNumber(k.high);
  const low = toFiniteNumber(k.low);
  const close = toFiniteNumber(k.close);
  const volume = toFiniteNumber(k.volume);
  const begin = typeof k.interval_begin === 'string' ? Date.parse(k.interval_begin) : NaN;
  if (
    open === null || high === null || low === null ||
    close === null || volume === null || !Number.isFinite(begin)
  ) {
    return null;
  }
  // v2 emits the live bucket per trade; rollover is signalled by a new
  // interval_begin, so the chart treats a new time as a new bar.
  return { bar: { time: begin, open, high, low, close, volume }, closed: false };
}

export async function fetchKrakenOhlc(
  restBase: string,
  symbol: string,
  timeframe: TimeFrame,
): Promise<OHLCBar[]> {
  const interval = krakenInterval(timeframe);
  const pair = symbol.replace('/', '');
  const url = `${restBase}/0/public/OHLC?pair=${encodeURIComponent(pair)}&interval=${interval}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Kraken REST error: ${res.status}`);
  const json: unknown = await res.json();
  return parseKrakenOhlc(json);
}

/** Parse Kraken's OHLC response (result keyed by canonical pair) into bars. */
export function parseKrakenOhlc(json: unknown): OHLCBar[] {
  if (!isObject(json) || !isObject(json.result)) return [];
  let rows: unknown = null;
  for (const [key, val] of Object.entries(json.result)) {
    if (key === 'last') continue;
    if (Array.isArray(val)) {
      rows = val;
      break;
    }
  }
  if (!Array.isArray(rows)) return [];
  const bars: OHLCBar[] = [];
  for (const row of rows) {
    const bar = parseKrakenOhlcRow(row);
    if (bar) bars.push(bar);
  }
  bars.sort((a, b) => a.time - b.time);
  return bars;
}

/** Kraken OHLC tuple: `[time(s), open, high, low, close, vwap, volume, count]`. */
export function parseKrakenOhlcRow(row: unknown): OHLCBar | null {
  if (!Array.isArray(row) || row.length < 7) return null;
  const time = toFiniteNumber(row[0]);
  const open = toFiniteNumber(row[1]);
  const high = toFiniteNumber(row[2]);
  const low = toFiniteNumber(row[3]);
  const close = toFiniteNumber(row[4]);
  const volume = toFiniteNumber(row[6]);
  if (
    time === null || open === null || high === null ||
    low === null || close === null || volume === null
  ) {
    return null;
  }
  return { time: time * 1000, open, high, low, close, volume };
}
