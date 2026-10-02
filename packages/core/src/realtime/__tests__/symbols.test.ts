import { describe, it, expect } from 'vitest';
import type { SymbolInfo } from '@tradecanvas/commons';
import { rankSymbols, stepDecimals, sessionMinute } from '@tradecanvas/commons';

const list: SymbolInfo[] = [
  { symbol: 'ETHBTC', description: 'ETH / BTC' },
  { symbol: 'BTCUSDT', description: 'BTC / USDT' },
  { symbol: 'WBTCUSDT', description: 'WBTC / USDT' },
  { symbol: 'BTC', description: 'Bitcoin index' },
  { symbol: 'AAPL', description: 'Apple Inc.' },
];

describe('rankSymbols', () => {
  it('puts an exact ticker first, then tickers that start with the query, then the earliest match', () => {
    expect(rankSymbols(list, 'btc').map((s) => s.symbol)).toEqual(['BTC', 'BTCUSDT', 'WBTCUSDT', 'ETHBTC']);
  });

  it('matches names too', () => {
    expect(rankSymbols(list, 'apple').map((s) => s.symbol)).toEqual(['AAPL']);
  });

  it('keeps the order for an empty query, and stops at the limit', () => {
    expect(rankSymbols(list, '  ', 2).map((s) => s.symbol)).toEqual(['ETHBTC', 'BTCUSDT']);
    expect(rankSymbols(list, 'usdt', 1)).toHaveLength(1);
  });
});

describe('stepDecimals', () => {
  it.each([
    ['0.01000000', 2],
    ['1.00000000', 0],
    ['0.00000001', 8],
    [0.5, 1],
    [0.25, 2],
    ['bad', 0],
  ] as const)('%s has %i decimals', (step, decimals) => {
    expect(stepDecimals(step)).toBe(decimals);
  });
});

describe('sessionMinute', () => {
  it('reads a time of day', () => {
    expect(sessionMinute('09:30')).toBe(570);
    expect(sessionMinute('9:30')).toBe(570);
    expect(sessionMinute('24:00')).toBeNull();
    expect(sessionMinute('noon')).toBeNull();
  });
});
