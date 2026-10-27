import { describe, it, expect, vi } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { ReplayStepLoader, MIN_REPLAY_ASK_GAP_MS } from '../ReplayStepLoader.js';

const MIN = 60_000;
const HOUR = 60 * MIN;
const bar = (time: number): OHLCBar => ({ time, open: 1, high: 2, low: 0.5, close: 1.5, volume: 1 });
const hours = Array.from({ length: 200 }, (_, h) => bar(h * HOUR));

describe('ReplayStepLoader', () => {
  it('keeps asking after a page with no finer bars, for the bars after it', async () => {
    let now = 0;
    // No minutes before hour 50, as when a venue keeps only recent ones.
    const source = vi.fn(async (before: number, limit: number) =>
      Array.from({ length: limit }, (_, i) => bar(before - (limit - i) * MIN)).filter((b) => b.time >= 50 * HOUR));
    const loader = new ReplayStepLoader({ source, step: '1m', ratio: 60, barMs: HOUR, keep: (b) => b, report: () => {}, now: () => now });
    loader.ensure(hours, 0, 1);
    await Promise.resolve();
    await Promise.resolve();
    expect(loader.piecesOf(0)).toBeUndefined();
    now += MIN_REPLAY_ASK_GAP_MS;
    loader.evictBefore(hours[60].time);
    loader.ensure(hours, 60, 1);
    await Promise.resolve();
    await Promise.resolve();
    expect(source).toHaveBeenCalledTimes(2);
    expect(loader.piecesOf(hours[60].time)).toHaveLength(60);
  });
});
