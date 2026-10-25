import type { OHLCBar } from '@tradecanvas/commons';

/** A seeded random number in [0, 1), so every run sees the same market. */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const cents = (x: number): number => Math.round(x * 100) / 100;

/** 2026-01-01 in seconds. */
const T0 = 1_767_225_600;

/**
 * One-second bars of a market near `start` (100,000 by default): each moves
 * about `move` from its open, so a bar's true range is about 10 while the
 * whole series spans a hundred or two, far less than 0.5% of the price.
 */
export function secondBars(count: number, { seed = 7, start = 100_000, move = 8 } = {}): OHLCBar[] {
  const rand = seeded(seed);
  const bars: OHLCBar[] = [];
  let close = start;
  for (let i = 0; i < count; i++) {
    const open = close;
    close = cents(open + (rand() + rand() + rand() - 1.5) * move * 2);
    const high = cents(Math.max(open, close) + (rand() * move) / 2);
    const low = cents(Math.min(open, close) - (rand() * move) / 2);
    bars.push({ time: T0 + i, open, high, low, close, volume: 1 + Math.round(rand() * 9) });
  }
  return bars;
}
