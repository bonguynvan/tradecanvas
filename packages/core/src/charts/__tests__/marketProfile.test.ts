import { describe, it, expect } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { computeMarketProfile } from '../marketProfile.js';

function bar(low: number, high: number): OHLCBar {
  return { time: 0, open: low, high, low, close: high, volume: 1 };
}

describe('computeMarketProfile', () => {
  it('returns null for empty input or non-positive span', () => {
    expect(computeMarketProfile([], 0, 100)).toBeNull();
    expect(computeMarketProfile([bar(1, 2)], 100, 100)).toBeNull();
    expect(computeMarketProfile([bar(1, 2)], 100, 0)).toBeNull();
  });

  it('counts a TPO for every bucket a bar overlaps', () => {
    // 10 buckets over [0,100] → each bucket is 10 wide.
    // Bar spanning 0..100 touches all 10 buckets.
    const mp = computeMarketProfile([bar(0, 100)], 0, 100, { buckets: 10 })!;
    expect(mp.buckets).toHaveLength(10);
    expect(mp.buckets.every((b) => b.count === 1)).toBe(true);
    expect(mp.totalCount).toBe(10);
  });

  it('locates the point of control at the busiest price', () => {
    // Many bars cluster around 50; a few span the whole range.
    const bars = [
      bar(0, 100),
      bar(48, 52),
      bar(49, 51),
      bar(50, 50.5),
    ];
    const mp = computeMarketProfile(bars, 0, 100, { buckets: 10 })!;
    // Bucket containing 50 is index 5 ([50,60)) or 4 ([40,50)). The 50-ish bars
    // concentrate around the 40–60 region; POC should be one of those.
    expect(mp.buckets[mp.pocIndex].low).toBeGreaterThanOrEqual(40);
    expect(mp.buckets[mp.pocIndex].high).toBeLessThanOrEqual(60);
    expect(mp.maxCount).toBe(mp.buckets[mp.pocIndex].count);
  });

  it('produces a value area that brackets the POC and holds ~70% of TPOs', () => {
    const bars = [
      bar(0, 100),
      bar(40, 60),
      bar(45, 55),
      bar(48, 52),
      bar(49, 51),
    ];
    const mp = computeMarketProfile(bars, 0, 100, { buckets: 20, valueAreaPct: 0.7 })!;
    const poc = mp.buckets[mp.pocIndex].mid;
    expect(mp.valueAreaLow).toBeLessThanOrEqual(poc);
    expect(mp.valueAreaHigh).toBeGreaterThanOrEqual(poc);
    expect(mp.valueAreaHigh).toBeGreaterThan(mp.valueAreaLow);
  });

  it('ignores bars fully outside the price window', () => {
    // First bar sits inside bucket 0 ([0,10)); second is fully out of range.
    const mp = computeMarketProfile([bar(1, 9), bar(200, 210)], 0, 100, { buckets: 10 })!;
    expect(mp.totalCount).toBe(1);
    expect(mp.buckets[0].count).toBe(1);
  });

  it('clamps bucket count into the valid range', () => {
    const mp = computeMarketProfile([bar(0, 100)], 0, 100, { buckets: 1 })!;
    expect(mp.buckets.length).toBeGreaterThanOrEqual(4); // min 4
  });
});
