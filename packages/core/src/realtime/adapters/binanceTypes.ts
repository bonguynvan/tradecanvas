import type { OHLCBar } from '@tradecanvas/commons';

/**
 * Binance REST `/klines` returns a 12-element array per kline.
 * Index map (per Binance docs):
 *   0 openTime, 1 open, 2 high, 3 low, 4 close, 5 volume,
 *   6 closeTime, 7 quoteVolume, 8 trades, 9 takerBuyBase,
 *   10 takerBuyQuote, 11 ignore
 * Numeric fields come back as strings except the timestamps.
 */
export type BinanceRestKline = readonly [
  number, // 0  openTime
  string, // 1  open
  string, // 2  high
  string, // 3  low
  string, // 4  close
  string, // 5  volume
  number, // 6  closeTime
  string, // 7  quoteVolume
  number, // 8  trades
  string, // 9  takerBuyBase
  string, // 10 takerBuyQuote
  string, // 11 ignore
];

/** Binance WS kline payload (`msg.k`). All numeric fields arrive as strings. */
export interface BinanceWsKline {
  t: number; // start time
  T: number; // close time
  s: string; // symbol
  i: string; // interval
  o: string; // open
  c: string; // close
  h: string; // high
  l: string; // low
  v: string; // base volume
  n: number; // trades
  x: boolean; // closed
  q?: string; // quote volume
}

export interface BinanceWsMessage {
  e?: string; // event type
  E?: number; // event time
  s?: string;
  k?: BinanceWsKline;
}

/**
 * Validate and parse a single REST kline tuple. Returns `null` on shape mismatch
 * or non-finite numeric values. Pure — no fetch, no side effects — testable.
 */
export function parseRestKline(raw: unknown): OHLCBar | null {
  if (!Array.isArray(raw) || raw.length < 6) return null;
  const time = raw[0];
  if (typeof time !== 'number' || !Number.isFinite(time)) return null;

  const open = toFiniteNumber(raw[1]);
  const high = toFiniteNumber(raw[2]);
  const low = toFiniteNumber(raw[3]);
  const close = toFiniteNumber(raw[4]);
  const volume = toFiniteNumber(raw[5]);
  if (open === null || high === null || low === null || close === null || volume === null) {
    return null;
  }
  return { time, open, high, low, close, volume };
}

/**
 * Validate and parse the `k` payload of a WS kline message.
 * Returns `{ bar, closed }` or `null` if the payload is malformed.
 */
export function parseWsKline(
  raw: unknown,
): { bar: OHLCBar; closed: boolean } | null {
  if (!isObject(raw)) return null;
  const time = raw.t;
  if (typeof time !== 'number' || !Number.isFinite(time)) return null;

  const open = toFiniteNumber(raw.o);
  const high = toFiniteNumber(raw.h);
  const low = toFiniteNumber(raw.l);
  const close = toFiniteNumber(raw.c);
  const volume = toFiniteNumber(raw.v);
  if (open === null || high === null || low === null || close === null || volume === null) {
    return null;
  }
  const closed = typeof raw.x === 'boolean' ? raw.x : false;
  return { bar: { time, open, high, low, close, volume }, closed };
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
