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

  it('raises a range to the first multiple that makes no more, however far the price swings inside it', () => {
    // 150,000 swings of 1.9 close more than 100,000 bars of 1 and none of 2: their 285,000 of travel must not
    // pass for bars of 2. The climb of 30 then closes 15.
    const swings = Array.from({ length: 150_000 }, (_, i) => bar(100, 100.95, 99.05, 100, i));
    const data = [...swings, bar(100, 130, 100, 130, 150_000), bar(130, 130, 130, 130, 150_001)];
    const out = toRangeBars(data, { rangeSize: 1 });
    expect(new Set(out.map((b) => Number((b.high - b.low).toFixed(9))))).toEqual(new Set([2]));
    expect(out).toHaveLength(15);
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

  it('closes no bar on a range under half a kept digit, on prices written as whole ticks times the tick size', () => {
    // Prices up to 11 keep digits down to 1e-13. 5507 * 0.0001 is 0.5507000000000001, which the kept digits read
    // as 0.5507: that high less 1e-14 must not close a bar at 0.5507 on a move that went from 0.01 down to -0.05.
    const data = [
      bar(0.01, 0.01, -0.03, -0.02, 0),
      bar(-0.02, 5_507 * 0.0001, -0.02, 0.5, 1),
      bar(0.5, 0.5, -0.05, -0.05, 2),
      bar(-0.05, 11, -0.05, 11, 3),
    ];
    expect(toRangeBars(data, { rangeSize: 1e-14 })).toEqual([]);
    const forming = toRangeBars(data, { rangeSize: 1e-14, includeForming: true });
    expect(forming).toHaveLength(1);
    expect(forming[0]).toMatchObject({ time: 0, open: 0.01, high: 11, low: -0.05, close: 11 });
  });

  it('keeps 15 significant digits of a largest price that is a power of ten', () => {
    // Prices up to exactly 100 keep digits down to 1e-12, as those up to 99.9 do: a range under half of that closes no bar.
    const data = Array.from({ length: 50 }, (_, i) => bar(99 + (i % 2), 100, 99, 99 + ((i + 1) % 2), i));
    expect(toRangeBars(data, { rangeSize: 4.9e-13 })).toEqual([]);
    // A whole kept digit closes a bar on each of them.
    const climb = [bar(99.999999999995, 99.999999999995, 99.999999999995, 99.999999999995, 0), bar(99.999999999995, 100, 99.999999999995, 100, 1)];
    expect(toRangeBars(climb, { rangeSize: 1e-12 }).map((b) => b.close)).toEqual([99.999999999996, 99.999999999997, 99.999999999998, 99.999999999999, 100]);
  });

  it('raises a range just over half a kept digit rather than close a bar short of a price it reached', () => {
    // Prices near 64 keep digits down to 1e-13, and 63.9999999999998 less 5.85e-14 rounds back to itself, so the bar
    // can't close on the way down. Its low runs on to 63.9999999999898, and the climb back would close it at
    // 63.9999999999899, far under the 63.9999999999998 it opened at.
    const data = [
      bar(63.9999999999998, 63.9999999999998, 63.9999999999998, 63.9999999999998, 0),
      bar(63.9999999999998, 63.9999999999998, 63.9999999999898, 63.9999999999898, 1),
      bar(63.9999999999898, 63.9999999999999, 63.9999999999898, 63.9999999999999, 2),
    ];
    const out = toRangeBars(data, { rangeSize: 5.85e-14, includeForming: true });
    expect(out).toEqual(toRangeBars(data, { rangeSize: 1.17e-13, includeForming: true }));
    for (const b of out) {
      expect(b.high).toBeGreaterThanOrEqual(Math.max(b.open, b.close));
      expect(b.low).toBeLessThanOrEqual(Math.min(b.open, b.close));
    }
  });

  it('closes no bar on any range under half a kept digit, on series of whole ticks', () => {
    // Ticks of 0.1, 0.01 and 0.0001 near 50 and 100,000, at a range of 0.05 to 0.45 of the last digit kept.
    let seed = 11;
    const random = () => (seed = (seed * 1_664_525 + 1_013_904_223) >>> 0) / 2 ** 32;
    for (let s = 0; s < 120; s++) {
      const tick = [0.1, 0.01, 0.0001][s % 3];
      let close = Math.round((s % 2 === 0 ? 50 : 100_000) / tick);
      const swing = Math.max(2, Math.round(close * 0.002));
      const data = Array.from({ length: 60 }, (_, i) => {
        const open = close;
        close = open + Math.round((random() + random() - 1) * swing);
        const high = Math.max(open, close) + Math.round((random() * swing) / 2);
        const low = Math.min(open, close) - Math.round((random() * swing) / 2);
        return bar(open * tick, high * tick, low * tick, close * tick, i);
      });
      const high = Math.max(...data.map((b) => b.high));
      const keptDigit = 10 ** (Math.floor(Math.log10(high)) + 1 - 15);
      const out = toRangeBars(data, { rangeSize: (0.05 + 0.4 * random()) * keptDigit, includeForming: true });
      expect(out).toHaveLength(1);
      expect(out[0]).toMatchObject({ open: data[0].open, high, low: Math.min(...data.map((b) => b.low)), close: data.at(-1)!.close });
    }
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

  it('walks the series a few times, not once a step, when the last bar alone is far too wide', () => {
    // 5,000 bars near 60,000, and a bad print on the forming bar: the range goes from 200 to some 100,000,000.
    const prices = Array.from({ length: 5_000 }, (_, i) => 60_000 + 300 * Math.sin(i / 7));
    const data = prices.map((open, i) => {
      const close = prices[i + 1] ?? open;
      return bar(open, Math.max(open, close) + 50, Math.min(open, close) - 50, close, i);
    });
    data[data.length - 1] = { ...data[data.length - 1], high: 6e12 };
    let reads = 0;
    const counted = data.map((b) => ({ ...b, get close() { reads++; return b.close; } }));
    const out = toRangeBars(counted, { rangeSize: 200, includeForming: true });
    expect(out.length).toBeGreaterThan(0);
    // Two reads of each close a walk, and one for the spans the steps are measured by.
    expect(reads / data.length).toBeLessThan(10);
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

  it('keeps the decimals when a high or a low is no finite number', () => {
    const steps = Array.from({ length: 30 }, (_, i) => bar(100 + i * 0.1, 100 + i * 0.1, 100 + i * 0.1, 100 + i * 0.1, i));
    for (const odd of [NaN, Infinity]) {
      const data = [...steps.slice(0, 10), { ...steps[10], high: odd }, { ...steps[11], low: -odd }, ...steps.slice(12)];
      const out = toRangeBars(data, { rangeSize: 0.1 });
      expect(out.length).toBeGreaterThan(20);
      for (const b of out) expect(Number(b.close.toFixed(1))).toBe(b.close);
    }
  });

  it('keeps closing bars on a price the kept digits read as where the bar closes', () => {
    // 1002094 * 0.1 is 100209.40000000001, as a feed sending whole ticks times a tick size writes 100209.4. The
    // bar must read it as 100209.4, its close on the way down, and not stop closing bars on a hair above it.
    const data = (low: number) => [
      bar(100_259.4, 100_259.4, 100_259.4, 100_259.4, 0),
      bar(100_259.4, 100_600, low, 100_600, 1),
      bar(100_600, 101_000, 100_600, 101_000, 2),
    ];
    const ohlc = (bars: OHLCBar[]) => bars.map((b) => [b.open, b.high, b.low, b.close]);
    const ticks = toRangeBars(data(1_002_094 * 0.1), { rangeSize: 50, includeForming: true });
    expect(ohlc(ticks)).toEqual(ohlc(toRangeBars(data(100_209.4), { rangeSize: 50, includeForming: true })));
    expect(ticks).toHaveLength(17);
  });

  it('keeps closing bars on a high the kept digits read as where the bar closes on the way up', () => {
    // 100000 * 0.000001 is 0.09999999999999999, as a feed sending whole ticks of 0.000001 writes 0.1. The bar must
    // read it as 0.1, its close on the way up from 0.0995, and not close on the way down at the price it opened at.
    const data = (high: number) => [
      bar(0.0995, 0.0995, 0.0995, 0.0995, 0),
      bar(0.0995, high, 0.098, 0.098, 1),
      bar(0.098, 0.098, 0.096, 0.096, 2),
    ];
    const ohlc = (bars: OHLCBar[]) => bars.map((b) => [b.open, b.high, b.low, b.close]);
    const config = { rangeSize: 0.0005, includeForming: true };
    const ticks = toRangeBars(data(100_000 * 0.000001), config);
    expect(ohlc(ticks)).toEqual(ohlc(toRangeBars(data(0.1), config)));
    expect(ticks.map((b) => b.close)).toEqual([0.1, 0.0995, 0.099, 0.0985, 0.098, 0.0975, 0.097, 0.0965, 0.096]);
  });

  it('adds no bar still forming for a last price the kept digits read as the last close', () => {
    // 1003 * 0.1 is 100.30000000000001: the bars close at 100.1, 100.2 and 100.3, and nothing has moved since.
    const data = [bar(100, 100, 100, 100, 0), bar(100, 1_003 * 0.1, 100, 1_003 * 0.1, 1)];
    const out = toRangeBars(data, { rangeSize: 0.1, includeForming: true });
    expect(out.map((b) => b.close)).toEqual([100.1, 100.2, 100.3]);
  });

  it('keeps closing bars where the kept digits read the low plus the range as the high', () => {
    // Near 1e16 a float steps by 2: the low, 9,999,999,999,999,998, plus 3 reads as the high, 1e16. The bar closes
    // there, at the price it opened at, with its wick below, and the climb to 1e16 + 20 goes on in bars of its own.
    const low = 9_999_999_999_999_998;
    const data = [bar(1e16, 1e16, 1e16, 1e16, 0), bar(1e16, 1e16, low, low, 1), bar(low, 1e16 + 20, low, 1e16 + 20, 2)];
    const out = toRangeBars(data, { rangeSize: 3, includeForming: true });
    expect(out[0]).toMatchObject({ open: 1e16, high: 1e16, low, close: 1e16 });
    expect(out.length).toBeGreaterThan(1);
    expect(out.at(-1)!.close).toBe(1e16 + 20);
    for (const b of out) expect(b.high).toBeGreaterThanOrEqual(b.low);
  });

  it('closes every bar at the range on a day of prices written as whole ticks times 0.1', () => {
    let seed = 5;
    const random = () => (seed = (seed * 1_664_525 + 1_013_904_223) >>> 0) / 2 ** 32;
    let close = 1_000_000;
    const data = Array.from({ length: 3_000 }, (_, i) => {
      const open = close;
      close = open + Math.round((random() + random() + random() - 1.5) * 160);
      const high = Math.max(open, close) + Math.round(random() * 40);
      const low = Math.min(open, close) - Math.round(random() * 40);
      return bar(open * 0.1, high * 0.1, low * 0.1, close * 0.1, i);
    });
    const out = toRangeBars(data, { rangeSize: 10, includeForming: true });
    expect(out.length).toBeGreaterThan(1_000);
    for (const b of out.slice(0, -1)) {
      expect(b.high - b.low).toBeCloseTo(10, 6);
      expect(b.high).toBeGreaterThanOrEqual(Math.max(b.open, b.close));
      expect(b.low).toBeLessThanOrEqual(Math.min(b.open, b.close));
    }
    expect(out.at(-1)!.high - out.at(-1)!.low).toBeLessThan(10);
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
