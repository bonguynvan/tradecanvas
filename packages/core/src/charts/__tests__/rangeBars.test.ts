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

  it('every emitted bar has high - low exactly equal to rangeSize, and closes at its high or its low', () => {
    const data = Array.from({ length: 50 }, (_, i) => bar(100 + i, 101 + i, 99.5 + i, 100.5 + i, i));
    const out = toRangeBars(data, { rangeSize: 2 });
    expect(out.length).toBeGreaterThan(5);
    for (const b of out) {
      expect(b.high - b.low).toBeCloseTo(2, 6);
      expect(b.close === b.high || b.close === b.low).toBe(true);
    }
  });

  it('closes at the far end plus the range, with the wick of the way it went first', () => {
    // Opens at 100, dips to 98, then rises to 102: the bar spans 98 to 102 and closes at 102, which traded.
    const data = [bar(100, 100, 100, 100, 0), bar(100, 100, 98, 98, 1), bar(98, 102, 98, 102, 2)];
    expect(toRangeBars(data, { rangeSize: 4 })).toEqual([
      { time: 0, open: 100, high: 102, low: 98, close: 102, volume: 0 },
    ]);
  });

  it('makes a bar for each range a jump covers', () => {
    const data = [bar(100, 100, 100, 100, 0), bar(100, 107, 100, 107, 1)];
    expect(toRangeBars(data, { rangeSize: 2 }).map((b) => b.close)).toEqual([102, 104, 106]);
  });

  it('fills a gap between bars with a bar for each range', () => {
    const data = [bar(100, 100, 100, 100, 0), bar(107, 107, 107, 107, 1)];
    const out = toRangeBars(data, { rangeSize: 2 });
    expect(out.map((b) => [b.open, b.close])).toEqual([[100, 102], [102, 104], [104, 106]]);
  });

  it('keeps the bar still forming with includeForming: a quiet market is one bar, not none', () => {
    const data = [
      bar(100, 100.5, 99.5, 100.2, 0),
      bar(100.2, 100.6, 99.7, 100.3, 1),
    ];
    const out = toRangeBars(data, { rangeSize: 5, includeForming: true });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ open: 100, high: 100.6, low: 99.5, close: 100.3 });
  });

  it('ends on the last price with includeForming, a slot after the closed bars', () => {
    const data = Array.from({ length: 40 }, (_, i) => bar(100 + i, 102 + i, 98 + i, 101 + i, i * 60_000));
    const closed = toRangeBars(data, { rangeSize: 3 });
    const out = toRangeBars(data, { rangeSize: 3, includeForming: true });
    expect(out.slice(0, -1)).toEqual(closed);
    expect(out.at(-1)!.close).toBe(140);
    expect(out.at(-1)!.open).toBe(closed.at(-1)!.close);
    expect(out.at(-1)!.time).toBe(closed.at(-1)!.time + 1);
  });

  it('keeps every bar of volume, a jump’s shared over the bars it closes', () => {
    const data = [bar(100, 100, 100, 100, 0, 6), bar(100, 107, 100, 107, 1, 30), bar(107, 107.5, 106.5, 107, 2, 9)];
    const out = toRangeBars(data, { rangeSize: 2, includeForming: true });
    expect(out.reduce((sum, b) => sum + b.volume, 0)).toBeCloseTo(45, 9);
    // The first bar holds what traded before the jump (6 + 10), and the jump’s 10 is split three ways.
    const jump = out.slice(0, 3).map((b) => b.volume);
    expect(jump[0]).toBeCloseTo(16 + 10 / 3, 9);
    expect(jump[1]).toBeCloseTo(10 / 3, 9);
    expect(jump[2]).toBeCloseTo(10 / 3, 9);
  });

  it('closes on the decimals the prices have, without float dust', () => {
    const data = Array.from({ length: 30 }, (_, i) => bar(100 + i * 0.1, 100 + i * 0.1, 100 + i * 0.1, 100 + i * 0.1, i));
    const out = toRangeBars(data, { rangeSize: 0.1 });
    for (const b of out) expect(Number(b.close.toFixed(1))).toBe(b.close);
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
