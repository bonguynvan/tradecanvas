import { describe, it, expect } from 'vitest';
import { toRangeBars } from '../transforms/rangeBars.js';
import type { OHLCBar } from '@tradecanvas/commons';

function bar(o: number, h: number, l: number, c: number, time = 0, v = 0): OHLCBar {
  return { time, open: o, high: h, low: l, close: c, volume: v };
}

describe('toRangeBars', () => {
  it('returns empty for empty input', () => {
    expect(toRangeBars([], { rangeSize: 1 })).toEqual([]);
  });

  it('returns empty when rangeSize is non-positive', () => {
    const data = [bar(100, 105, 95, 102, 0)];
    expect(toRangeBars(data, { rangeSize: 0 })).toEqual([]);
    expect(toRangeBars(data, { rangeSize: -1 })).toEqual([]);
  });

  it('emits no bars when total movement is below rangeSize', () => {
    const data = [
      bar(100, 100.5, 99.5, 100.2, 0),
      bar(100.2, 100.6, 99.7, 100.3, 1),
    ];
    expect(toRangeBars(data, { rangeSize: 5 })).toHaveLength(0);
  });

  it('every emitted bar has high - low exactly equal to rangeSize', () => {
    const data = Array.from({ length: 50 }, (_, i) => bar(100 + i, 101 + i, 99.5 + i, 100.5 + i, i));
    const out = toRangeBars(data, { rangeSize: 2 });
    expect(out.length).toBeGreaterThan(5);
    for (const b of out) {
      expect(b.high - b.low).toBeCloseTo(2, 6);
      expect(b.close).toBeCloseTo(b.open + (b.close >= b.open ? 2 : -2), 6);
    }
  });

  it('emits up-bars on a sustained uptrend', () => {
    const data = Array.from({ length: 30 }, (_, i) => bar(100 + i, 100 + i, 100 + i, 100 + i, i));
    const out = toRangeBars(data, { rangeSize: 3 });
    expect(out.every((b) => b.close > b.open)).toBe(true);
  });

  it('emits down-bars on a sustained downtrend', () => {
    const data = Array.from({ length: 30 }, (_, i) => bar(200 - i, 200 - i, 200 - i, 200 - i, i));
    const out = toRangeBars(data, { rangeSize: 3 });
    expect(out.every((b) => b.close < b.open)).toBe(true);
  });

  it('produces strictly increasing time values for downstream rendering', () => {
    const data = Array.from({ length: 40 }, (_, i) => bar(100 + i, 102 + i, 98 + i, 101 + i, i * 60_000));
    const out = toRangeBars(data, { rangeSize: 4 });
    for (let i = 1; i < out.length; i++) {
      expect(out[i].time).toBeGreaterThan(out[i - 1].time);
    }
  });

  it('count of emitted bars approximates total range / rangeSize on a clean trend', () => {
    const data = Array.from({ length: 100 }, (_, i) => bar(100 + i, 100 + i, 100 + i, 100 + i, i));
    const out = toRangeBars(data, { rangeSize: 10 });
    // total move = 99 → ~9–10 bars
    expect(out.length).toBeGreaterThanOrEqual(8);
    expect(out.length).toBeLessThanOrEqual(10);
  });
});
