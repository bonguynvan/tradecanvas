import { describe, it, expect } from 'vitest';
import {
  parseCoinbaseCandle,
  parseCoinbaseCandles,
  coinbaseGranularity,
} from '../CoinbaseAdapter.js';

describe('CoinbaseAdapter parsing', () => {
  it('parses a [time(s), low, high, open, close, volume] tuple into a ms bar', () => {
    expect(parseCoinbaseCandle([1700000000, 9, 12, 10, 11, 5])).toEqual({
      time: 1700000000000,
      open: 10,
      high: 12,
      low: 9,
      close: 11,
      volume: 5,
    });
  });

  it('returns ascending bars from a newest-first response', () => {
    const bars = parseCoinbaseCandles([
      [1700000120, 1, 2, 1, 2, 1],
      [1700000060, 1, 2, 1, 2, 1],
      [1700000000, 1, 2, 1, 2, 1],
    ]);
    expect(bars.map((b) => b.time)).toEqual([1700000000000, 1700000060000, 1700000120000]);
  });

  it('rejects malformed rows', () => {
    expect(parseCoinbaseCandle([1, 2, 3])).toBeNull();
    expect(parseCoinbaseCandle('nope')).toBeNull();
    expect(parseCoinbaseCandle([1700000000, 'x', 12, 10, 11, 5])).toBeNull();
  });

  it('maps timeframes to granularity seconds (unsupported → 1h default)', () => {
    expect(coinbaseGranularity('1m')).toBe(60);
    expect(coinbaseGranularity('1d')).toBe(86400);
    expect(coinbaseGranularity('3m')).toBe(3600);
  });
});
