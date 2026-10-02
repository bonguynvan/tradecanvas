import type { OHLCBar } from '../types/ohlc.js';

/** The price an indicator can be computed from. */
export const PRICE_SOURCES = ['close', 'open', 'high', 'low', 'hl2', 'hlc3', 'ohlc4', 'hlcc4'] as const;

export type PriceSource = (typeof PRICE_SOURCES)[number];

export function isPriceSource(value: unknown): value is PriceSource {
  return typeof value === 'string' && (PRICE_SOURCES as readonly string[]).includes(value);
}

/** A bar's price by source: `hl2` = (high + low) / 2, `hlc3`, `ohlc4`, `hlcc4` = (h + l + 2c) / 4. */
export function sourcePrice(bar: OHLCBar, source: PriceSource): number {
  switch (source) {
    case 'open': return bar.open;
    case 'high': return bar.high;
    case 'low': return bar.low;
    case 'hl2': return (bar.high + bar.low) / 2;
    case 'hlc3': return (bar.high + bar.low + bar.close) / 3;
    case 'ohlc4': return (bar.open + bar.high + bar.low + bar.close) / 4;
    case 'hlcc4': return (bar.high + bar.low + 2 * bar.close) / 4;
    default: return bar.close;
  }
}

const INDICATOR_SOURCE = /^ind:([^:]+):(.+)$/;

/** A source that is another indicator's line: `ind:<instanceId>:<key>`. */
export function indicatorSource(instanceId: string, key: string): string {
  return `ind:${instanceId}:${key}`;
}

/** The indicator line a source refers to, or null for a price source or anything else. */
export function parseIndicatorSource(value: unknown): { instanceId: string; key: string } | null {
  if (typeof value !== 'string') return null;
  const m = INDICATOR_SOURCE.exec(value);
  return m ? { instanceId: m[1], key: m[2] } : null;
}
