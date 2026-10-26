import { describe, it, expect } from 'vitest';
import type { DataSeries, OHLCBar } from '@tradecanvas/commons';
import { toRenko } from '../transforms/renko.js';
import { toKagi } from '../transforms/kagi.js';
import { toPointAndFigure, pointAndFigureColumns } from '../transforms/pointAndFigure.js';
import { toLineBreak } from '../transforms/lineBreak.js';
import { toRangeBars } from '../transforms/rangeBars.js';
import { MAX_RESHAPED_BARS, reshape, reshapeOneABar, sizeAt, type ReshapeWalk } from '../transforms/reshapeCap.js';

/** What a test gives a transform at most: a stalled one fails it, where it once filled the tab's memory. */
const FAST_MS = 1_000;
const TINY = 1e-9;

function bar(time: number, open: number, close: number, spread = 0): OHLCBar {
  return { time, open, high: Math.max(open, close) + spread, low: Math.min(open, close) - spread, close, volume: 1 };
}

/** 300 bars of a seeded walk near 60,000, the last one flat, so every bar a transform makes is closed. */
function nearSixtyThousand(): DataSeries {
  let seed = 7;
  let price = 60_000;
  const bars = Array.from({ length: 299 }, (_, i) => {
    seed = (seed * 16_807) % 2_147_483_647;
    const open = price;
    price += (seed / 2_147_483_647 - 0.5) * 120;
    return bar(i, open, price, 5);
  });
  return [...bars, bar(299, price, price)];
}

/** Closes 100, 101, 100, 104 over and over: every move reverses at a small size, only the 4s at twice it. */
function zigzag(length: number): DataSeries {
  const closes = [100, 101, 100, 104];
  return Array.from({ length }, (_, i) => bar(i, closes[(i + 3) % 4], closes[i % 4]));
}

/** `data` with bar `at`'s close read through a count: how many times a transform walked the series. */
function countingReads(data: DataSeries, at: number): { data: DataSeries; reads: () => number } {
  let reads = 0;
  const watched = { ...data[at] };
  Object.defineProperty(watched, 'close', { get: () => { reads++; return data[at].close; } });
  return { data: data.map((b, i) => (i === at ? watched : b)), reads: () => reads };
}

/** 150,000 bars of a seeded walk from `start`, a step of up to half `move` either way. */
function longWalk(start: number, move: number): DataSeries {
  let seed = 11;
  let price = start;
  return Array.from({ length: 150_000 }, (_, i) => {
    seed = (seed * 16_807) % 2_147_483_647;
    const open = price;
    price += (seed / 2_147_483_647 - 0.5) * move;
    return bar(i, open, price);
  });
}

function timed<T>(make: () => T): { out: T; ms: number } {
  const start = performance.now();
  const out = make();
  return { out, ms: performance.now() - start };
}

describe('a size far too small for the prices', () => {
  const data = nearSixtyThousand();
  const cases: [string, () => DataSeries][] = [
    ['Renko', () => toRenko(data, { brickSize: TINY })],
    ['Kagi, in price', () => toKagi(data, TINY, 'price')],
    ['Kagi, in percent', () => toKagi(data, TINY)],
    ['point & figure', () => toPointAndFigure(data, TINY)],
    ['line break', () => toLineBreak(data, 1)],
    ['range bars', () => toRangeBars(data, { rangeSize: TINY })],
  ];

  it.each(cases)('%s on 300 bars near 60,000 finishes fast and makes at most the cap', (_, make) => {
    const { out, ms } = timed(make);
    expect(ms).toBeLessThan(FAST_MS);
    expect(out.length).toBeGreaterThan(0);
    expect(out.length).toBeLessThanOrEqual(MAX_RESHAPED_BARS);
  });
});

describe('Renko keeps to the cap', () => {
  it('raises a tiny box to the first 1-2-5 multiple that makes no more, and lays every brick on it', () => {
    const data = nearSixtyThousand();
    const bricks = toRenko(data, { brickSize: TINY });
    const size = bricks[0].high - bricks[0].low;
    expect(bricks.reduce((most, b) => Math.max(most, Math.abs(b.high - b.low - size)), 0)).toBeLessThan(1e-6);
    const multiple = Number((size / TINY).toPrecision(6));
    expect([1, 2, 5]).toContain(multiple / 10 ** Math.floor(Math.log10(multiple)));
  });

  it('takes the first multiple under the cap: 5 where 1 and 2 make too many', () => {
    // A climb of 250,000 is 250,000 bricks of 1 and 125,000 of 2, then 50,000 of 5.
    const data = [bar(0, 100, 100), bar(1, 100, 250_100), bar(2, 250_100, 250_100)];
    const bricks = toRenko(data, { brickSize: 1 });
    expect(bricks).toHaveLength(50_000);
    expect(bricks.every((b) => b.close - b.open === 5)).toBe(true);
  });

  it('keeps a box that makes 100,000 bricks on the last bar alone, and raises it at one more', () => {
    const jumpTo = (top: number) => toRenko([bar(0, 100, 100), bar(1, 100, top)], { brickSize: 1 });
    expect(jumpTo(100_100)).toHaveLength(100_000);
    const raised = jumpTo(100_101);
    expect(raised).toHaveLength(50_000);
    expect(raised.every((b) => b.close - b.open === 2)).toBe(true);
  });

  it('raises a box the bars before the last make too many of, though the last is quiet', () => {
    const data = [bar(0, 100, 100), bar(1, 100, 100_101), bar(2, 100_101, 100_101)];
    const bricks = toRenko(data, { brickSize: 1 });
    expect(bricks).toHaveLength(50_000);
    expect(new Set(bricks.map((b) => b.close - b.open))).toEqual(new Set([2]));
  });

  it('lets the last bar make as many again on its own, so a tick seldom moves the box', () => {
    // 90,000 bricks of 1 closed, then a last bar of 90,000 more: each part is under the cap.
    const data = [bar(0, 100, 100), bar(1, 100, 90_100), bar(2, 90_100, 180_100)];
    const bricks = toRenko(data, { brickSize: 1 });
    expect(bricks).toHaveLength(180_000);
    expect(bricks.every((b) => b.close - b.open === 1)).toBe(true);
  });

  it('passes over a close that is no finite number, where an infinite one laid bricks without end', () => {
    const data = [bar(0, 100, 100), { ...bar(1, 100, 104), close: Infinity }, bar(2, 100, 104), { ...bar(3, 104, 104), close: NaN }];
    expect(toRenko(data, { brickSize: 2 }).map((b) => b.close)).toEqual([102, 104]);
  });

  it('starts from the first finite close', () => {
    const data = [{ ...bar(0, 100, 100), close: NaN }, bar(1, 100, 100), bar(2, 100, 104)];
    expect(toRenko(data, { brickSize: 2 }).map((b) => b.close)).toEqual([102, 104]);
  });

  it('lays the bricks in one walk when the box keeps to the cap', () => {
    const { data, reads } = countingReads(longWalk(60_000, 120), 50_000);
    expect(toRenko(data, { brickSize: 100 }).length).toBeGreaterThan(0);
    expect(reads()).toBe(1);
  });

  it('raises a box near the smallest number too, to the first 1-2-5 step that makes no more', () => {
    const data = nearSixtyThousand();
    for (const tiny of [1e-310, 5e-324]) {
      const bricks = toRenko(data, { brickSize: tiny });
      expect(bricks.length, String(tiny)).toBeGreaterThan(0);
      expect(bricks.length, String(tiny)).toBeLessThanOrEqual(MAX_RESHAPED_BARS);
      const mantissa = Number((bricks[0].high - bricks[0].low).toExponential(6).split('e')[0]);
      expect([1, 2, 5, 2.5, 10, 25], String(tiny)).toContain(mantissa);
    }
  });

  it('makes no brick at a box no number can raise to the prices', () => {
    expect(toRenko(nearSixtyThousand(), { brickSize: Infinity })).toEqual([]);
  });
});

describe('Kagi keeps to the cap', () => {
  it('raises a reversal with which the bars before the last would make more than 100,000 lines', () => {
    const data = zigzag(150_000);
    // At 1 every move reverses, about 150,000 lines; at 2 only the moves of 4 do, about 75,000.
    const lines = toKagi(data, 1, 'price');
    expect(lines.length).toBeLessThanOrEqual(MAX_RESHAPED_BARS + 1);
    expect(lines).toEqual(toKagi(data, 2, 'price'));
  });

  it('raises a reversal in percent the same way', () => {
    const data = zigzag(150_000);
    const lines = toKagi(data, 0.5);
    expect(lines.length).toBeLessThanOrEqual(MAX_RESHAPED_BARS + 1);
    expect(lines).toEqual(toKagi(data, 1));
  });

  it('makes the lines in one walk of a long series when the reversal keeps to the cap', () => {
    const { data, reads } = countingReads(zigzag(150_000), 50_000);
    expect(toKagi(data, 2, 'price')).toHaveLength(74_999);
    expect(reads()).toBe(1);
  });

  it('lays every line, in a few walks, when no reversal keeps to the cap: prices all at 0', () => {
    const zeros = Array.from({ length: 150_000 }, (_, i) => bar(i, 0, 0));
    const { data, reads } = countingReads(zeros, 50_000);
    expect(toKagi(data, 4)).toHaveLength(150_000);
    expect(reads()).toBeLessThanOrEqual(4);
  });

  it('ends at the last close on prices below 0, where a reversal in percent of the start is no move', () => {
    const data = longWalk(-50, 0.05);
    expect(toKagi(data, 4).at(-1)?.close).toBe(data.at(-1)?.close);
  });

  it('keeps any reversal on a series too short to pass the cap: a line a bar at most', () => {
    const data = zigzag(1_000);
    expect(toKagi(data, TINY, 'price').length).toBeLessThanOrEqual(data.length);
    expect(toKagi(data, TINY, 'price')).not.toEqual(toKagi(data, 2, 'price'));
  });
});

describe('point & figure keeps to the cap', () => {
  it('raises a box with which the bars before the last would make more than 100,000 columns', () => {
    const data = zigzag(150_000);
    // Three boxes of 0.25 reverse on every move, about 150,000 columns; three of 0.5 only on the 4s.
    const { columns, boxSize } = pointAndFigureColumns(data, 0.25);
    expect(boxSize).toBe(0.5);
    expect(columns.length).toBeLessThanOrEqual(MAX_RESHAPED_BARS + 1);
    expect(columns).toEqual(toPointAndFigure(data, 0.5));
    expect(toPointAndFigure(data, 0.25)).toEqual(columns);
  });

  it('keeps the box asked for when the columns stay under the cap', () => {
    expect(pointAndFigureColumns(zigzag(1_000), 0.25).boxSize).toBe(0.25);
    expect(pointAndFigureColumns(zigzag(150_000), 1).boxSize).toBe(1);
  });

  it('builds the columns in one walk of a long series when the box keeps to the cap', () => {
    const { data, reads } = countingReads(zigzag(150_000), 50_000);
    expect(pointAndFigureColumns(data, 1).columns.length).toBe(74_999);
    expect(reads()).toBe(1);
  });

  it('raises a box so small that a price over it passes the largest number, on a short series too', () => {
    const data = nearSixtyThousand();
    for (const tiny of [1e-310, 5e-324]) {
      const { columns, boxSize } = pointAndFigureColumns(data, tiny);
      expect(columns.length, String(tiny)).toBeGreaterThan(1);
      expect(columns.every((c) => Number.isFinite(c.high) && Number.isFinite(c.low)), String(tiny)).toBe(true);
      expect(Number.isFinite(60_000 / boxSize), String(tiny)).toBe(true);
      expect(Number.isFinite(60_000 / (boxSize / 10)), String(tiny)).toBe(false);
    }
  });

  it('lays every column at the box asked when no box keeps to the cap: a reversal of no boxes', () => {
    // With no boxes to reverse, every move that doesn't extend a column reverses it, at any box.
    const { columns, boxSize } = pointAndFigureColumns(zigzag(150_000), 1, 0);
    expect(boxSize).toBe(1);
    expect(columns).toHaveLength(149_999);
  });
});

describe('the size a transform is raised to', () => {
  /** A walk that keeps to the cap from `enough` on, counting its walks, laying one bar a walk. */
  function fakeWalk(enough: number): { walk: ReshapeWalk; walks: () => number } {
    let walks = 0;
    const walk: ReshapeWalk = (size, capped, lay) => {
      walks++;
      if (capped && !(size >= enough)) return false;
      lay?.(bar(0, size, size));
      return true;
    };
    return { walk, walks: () => walks };
  }

  it('gives each 1-2-5 step of a size near the smallest number, the multiple passing the largest number', () => {
    expect(sizeAt(1e-310, 3 * 310)).toBe(1);
    expect(sizeAt(5e-324, 1 + 3 * 323)).toBe(1);
    expect(sizeAt(2, 3 * 308)).toBe(Infinity);
  });

  it('finds the first step that keeps to the cap in a few walks, not one a step', () => {
    const { walk, walks } = fakeWalk(1);
    const { bars, size } = reshape(5e-324, walk);
    expect(size).toBe(1);
    expect(bars).toHaveLength(1);
    expect(walks()).toBeLessThan(30);
    expect(reshape(0.3, fakeWalk(1).walk).size).toBe(1.5);
    expect(reshape(0.3, fakeWalk(0.6).walk).size).toBe(0.6);
  });

  it('gives up at once when even the largest size makes too many: Renko makes none, Kagi and point & figure every one', () => {
    const none = fakeWalk(Infinity);
    expect(reshape(4, none.walk)).toEqual({ bars: [], size: Infinity });
    expect(none.walks()).toBeLessThanOrEqual(3);
    const each = fakeWalk(Infinity);
    expect(reshapeOneABar(4, each.walk)).toEqual({ bars: [bar(0, 4, 4)], size: 4 });
    expect(each.walks()).toBeLessThanOrEqual(4);
  });

  it('lays a size that is no number above 0 as it is, in Kagi and point & figure: nothing raises it', () => {
    expect(reshapeOneABar(0, fakeWalk(1).walk)).toEqual({ bars: [bar(0, 0, 0)], size: 0 });
  });
});

describe('line break', () => {
  it('makes at most one line a bar, whatever the count of lines', () => {
    const data = nearSixtyThousand();
    for (const lines of [1, 3, 10]) expect(toLineBreak(data, lines).length).toBeLessThanOrEqual(data.length);
  });
});
