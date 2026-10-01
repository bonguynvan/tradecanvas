import type { OHLCBar } from '@tradecanvas/chart';

/**
 * Deterministic random-walk bars, seeded by `seed` (e.g. the symbol) so a
 * given ticker always draws the same chart. Ends at the current time.
 */
export function generateBars(count: number, seed: string, stepMs = 60_000, startPrice?: number): OHLCBar[] {
  let state = [...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rand = () => ((state = (state * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const start = Math.floor(Date.now() / stepMs) * stepMs - count * stepMs;
  const bars: OHLCBar[] = [];
  const anchor = startPrice ?? 100 + (state % 900);
  let price = anchor;
  for (let i = 0; i < count; i++) {
    const open = price;
    // A slow sine drift gives the walk visible swings to draw patterns on;
    // a gentle pull back toward the start keeps it ranging instead of trending away.
    const drift = Math.sin(i / 40) * 0.0012 + ((anchor - price) / anchor) * 0.01;
    const close = Math.max(price * 0.2, open * (1 + drift + (rand() - 0.5) * 0.008));
    const high = Math.max(open, close) * (1 + rand() * 0.003);
    const low = Math.min(open, close) * (1 - rand() * 0.003);
    bars.push({ time: start + i * stepMs, open, high, low, close, volume: 50 + rand() * 500 });
    price = close;
  }
  return bars;
}
