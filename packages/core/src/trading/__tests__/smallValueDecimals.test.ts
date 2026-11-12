import { describe, it, expect } from 'vitest';
import { MAX_PRICE_DECIMALS, smallValueDecimals } from '@tradecanvas/commons';

describe('smallValueDecimals', () => {
  it('gives the decimals that show four significant figures of a value under 1', () => {
    expect(smallValueDecimals(0.5)).toBe(4);
    expect(smallValueDecimals(0.01234)).toBe(5);
    expect(smallValueDecimals(0.00001234)).toBe(8);
    // Under a ten-millionth, where ten decimals cut the figures short.
    expect(smallValueDecimals(0.0000000712)).toBe(11);
    expect((0.00000007123456).toFixed(smallValueDecimals(0.00000007123456))).toBe('0.00000007123');
  });

  it('counts the figures asked for, and reads a negative value as its size', () => {
    expect(smallValueDecimals(0.000001234, 2)).toBe(7);
    expect(smallValueDecimals(-0.00001234)).toBe(8);
  });

  it('stops where every number format still takes it, and has an answer for nothing', () => {
    expect(smallValueDecimals(1e-30)).toBe(MAX_PRICE_DECIMALS);
    expect(smallValueDecimals(0)).toBe(3);
    expect(smallValueDecimals(Number.NaN)).toBe(3);
  });
});
