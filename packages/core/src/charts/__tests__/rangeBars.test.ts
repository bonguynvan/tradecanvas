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

  it('replays each bar from its open, so the bars filling a gap stand at prices the gap skipped', () => {
    // The second bar opens 7 above the first close, dips to 103 and ends at 108: the gap makes 102, 104 and 106,
    // which never traded, before the bar's own way down and up.
    const data = [bar(100, 100, 100, 100, 0), bar(107, 108, 103, 108, 1)];
    expect(toRangeBars(data, { rangeSize: 2 }).map((b) => [b.open, b.close])).toEqual([
      [100, 102], [102, 104], [104, 106], [106, 105], [105, 103], [103, 105], [105, 107],
    ]);
  });

  it('counts the bars it makes for the limit, not how far the price travels', () => {
    // 60,000 bars swinging 1.4 inside a range of 1.5 travel 168,000 but close no bar; a climb of 30 then closes 20.
    const noise = Array.from({ length: 60_000 }, (_, i) => bar(100, 100.7, 99.3, 100, i));
    const data = [...noise, bar(100, 130, 100, 130, 60_000), bar(130, 130, 130, 130, 60_001)];
    const out = toRangeBars(data, { rangeSize: 1.5 });
    expect(new Set(out.map((b) => Number((b.high - b.low).toFixed(9))))).toEqual(new Set([1.5]));
    expect(out).toHaveLength(20);
  });

  it('keeps a range that makes 100,000 bars, and raises it at one more', () => {
    const jumpTo = (top: number) => toRangeBars([bar(100, 100, 100, 100, 0), bar(100, top, 100, top, 1)], { rangeSize: 1 });
    expect(jumpTo(100_100)).toHaveLength(100_000);
    const raised = jumpTo(100_101);
    expect(raised).toHaveLength(50_000);
    expect(raised.every((b) => b.high - b.low === 2)).toBe(true);
  });

  it('raises a range the closed bars alone make too many of, and builds every bar on the raised one', () => {
    // The second bar climbs 100,001 at a range of 1; the last bar is quiet.
    const data = [bar(100, 100, 100, 100, 0), bar(100, 100_101, 100, 100_101, 1), bar(100_101, 100_101, 100_101, 100_101, 2)];
    const out = toRangeBars(data, { rangeSize: 1 });
    expect(out).toHaveLength(50_000);
    expect(new Set(out.map((b) => b.high - b.low))).toEqual(new Set([2]));
  });

  it('skips a price that is no finite number, where an infinite one would close bars without end', () => {
    const data = [bar(100, 100, 100, 100, 0), bar(100, Infinity, 100, 104, 1), bar(104, 104, NaN, 104, 2)];
    expect(toRangeBars(data, { rangeSize: 2 }).map((b) => b.close)).toEqual([102, 104]);
  });

  it('ends on a range finer than the digits prices are kept to', () => {
    // At 100,000 prices keep 15 digits, down to 1e-9: the low plus 4e-10 reads as the low, which closes no range.
    const data = [bar(100_000, 100_000, 100_000, 100_000, 0, 1), bar(100_000, 100_000.00001, 100_000, 100_000.00001, 1, 1)];
    const out = toRangeBars(data, { rangeSize: 4e-10, includeForming: true });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ time: 0, open: 100_000, high: 100_000.00001, low: 100_000, close: 100_000.00001 });
    expect(out[0].volume).toBeCloseTo(2, 9);
  });

  it('raises a range too small for the move to a whole multiple of itself, under 100,000 bars', () => {
    // 2.5 over a move of 1,000,000 would be 400,000 bars: five times it, 12.5, makes 80,000.
    const data = [bar(100, 100, 100, 100, 0), bar(100, 1_000_100, 100, 1_000_100, 1)];
    const out = toRangeBars(data, { rangeSize: 2.5 });
    expect(out).toHaveLength(80_000);
    expect(out.every((b) => b.high - b.low === 12.5)).toBe(true);
    expect(out.at(-1)!.close).toBe(1_000_100);
  });

  it('keeps a raised range when only the last bar moves', () => {
    // 200 moves of 1,000 would be 200,000 bars of 1, so the range is 2; a tick 2 lower on the last bar leaves it 2.
    const zigzag = Array.from({ length: 201 }, (_, i) => {
      const open = i === 0 || i % 2 === 1 ? 100 : 1_100;
      const close = i % 2 === 1 ? 1_100 : 100;
      return bar(open, Math.max(open, close), Math.min(open, close), close, i);
    });
    const spans = (data: OHLCBar[]) => new Set(toRangeBars(data, { rangeSize: 1 }).map((b) => b.high - b.low));
    expect(spans(zigzag)).toEqual(new Set([2]));
    const last = zigzag.at(-1)!;
    expect(spans([...zigzag.slice(0, -1), { ...last, low: 98, close: 98 }])).toEqual(new Set([2]));
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
