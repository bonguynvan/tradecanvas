import type { OHLCBar, TimeFrame } from '@tradecanvas/commons';
import { PollingAdapter } from './PollingAdapter.js';
import { toFiniteNumber } from './parseUtils.js';

/** Coinbase Exchange supports a fixed granularity set (seconds). */
const GRANULARITY: Partial<Record<TimeFrame, number>> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1h': 3600,
  '6h': 21600,
  '1d': 86400,
};

/** Map a TimeFrame to a Coinbase granularity (seconds), defaulting to 1h. */
export function coinbaseGranularity(timeframe: TimeFrame): number {
  return GRANULARITY[timeframe] ?? 3600;
}

export interface CoinbaseAdapterOptions {
  /** REST base, default `https://api.exchange.coinbase.com`. */
  restBase?: string;
  /** Poll interval in ms (default 5000). */
  intervalMs?: number;
}

/**
 * Coinbase Exchange adapter (no API key). Uses REST candle polling — the
 * Exchange candles endpoint covers every supported granularity, which the WS
 * candles channel does not. Product ids use the `BTC-USD` format. History is
 * capped at ~300 candles per Coinbase's limit.
 */
export class CoinbaseAdapter extends PollingAdapter {
  constructor(options: CoinbaseAdapterOptions = {}) {
    const restBase = options.restBase ?? 'https://api.exchange.coinbase.com';
    super({
      name: 'coinbase',
      intervalMs: options.intervalMs ?? 5000,
      pollLimit: 2,
      fetchBars: (symbol, timeframe) => fetchCoinbaseCandles(restBase, symbol, timeframe),
    });
  }
}

export async function fetchCoinbaseCandles(
  restBase: string,
  symbol: string,
  timeframe: TimeFrame,
): Promise<OHLCBar[]> {
  const granularity = coinbaseGranularity(timeframe);
  const url = `${restBase}/products/${symbol}/candles?granularity=${granularity}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Coinbase REST error: ${res.status}`);
  const data: unknown = await res.json();
  return parseCoinbaseCandles(data);
}

/** Parse Coinbase's candle response (newest-first) into ascending bars. */
export function parseCoinbaseCandles(data: unknown): OHLCBar[] {
  if (!Array.isArray(data)) return [];
  const bars: OHLCBar[] = [];
  for (const row of data) {
    const bar = parseCoinbaseCandle(row);
    if (bar) bars.push(bar);
  }
  bars.sort((a, b) => a.time - b.time);
  return bars;
}

/** Coinbase candle tuple: `[time(s), low, high, open, close, volume]`. */
export function parseCoinbaseCandle(row: unknown): OHLCBar | null {
  if (!Array.isArray(row) || row.length < 6) return null;
  const time = toFiniteNumber(row[0]);
  const low = toFiniteNumber(row[1]);
  const high = toFiniteNumber(row[2]);
  const open = toFiniteNumber(row[3]);
  const close = toFiniteNumber(row[4]);
  const volume = toFiniteNumber(row[5]);
  if (
    time === null || low === null || high === null ||
    open === null || close === null || volume === null
  ) {
    return null;
  }
  return { time: time * 1000, open, high, low, close, volume };
}
