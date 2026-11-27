import type { OHLCBar } from '@tradecanvas/commons';

const STEP = 5 * 60_000;
const START = Date.UTC(2026, 9, 1);

/** Seeded 5-minute bars: the same walk every run. */
export function seededBars(count: number, seed = 7): OHLCBar[] {
  let state = seed;
  const rand = () => (state = (state * 16807) % 2147483647) / 2147483647;
  let close = 100;
  return Array.from({ length: count }, (_, i) => {
    const open = close;
    close = Math.max(1, open + (rand() - 0.5) * 2);
    const high = Math.max(open, close) + rand() * 0.6;
    const low = Math.min(open, close) - rand() * 0.6;
    return { time: START + i * STEP, open, high, low, close, volume: 100 + Math.round(rand() * 900) };
  });
}

/** The worst relative difference where both have a value, and the bars where one has a value and the other none. */
export function difference(got: ArrayLike<number>, want: readonly (number | undefined)[]): { worst: number; mismatched: number[] } {
  let worst = 0;
  const mismatched: number[] = [];
  for (let i = 0; i < want.length; i++) {
    const a = got[i];
    const b = want[i];
    const hasA = Number.isFinite(a);
    const hasB = b !== undefined && Number.isFinite(b);
    if (hasA !== hasB) {
      mismatched.push(i);
      continue;
    }
    if (hasA && hasB) worst = Math.max(worst, Math.abs(a - b) / Math.max(1e-12, Math.abs(b)));
  }
  return { worst, mismatched };
}
