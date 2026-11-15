import { describe, it, expect } from 'vitest';
import type { DepthData } from '@tradecanvas/commons';
import { DepthOverlay, depthBars } from '../DepthOverlay.js';
import { recordingCtx, unitViewport } from '../../drawings/__tests__/fixtures.js';

// The unit viewport: price p is at y = 100 - p, the plot is 1000 px wide.
const book: DepthData = {
  bids: [{ price: 50, volume: 2 }, { price: 48, volume: 6 }, { price: 46, volume: 2 }],
  asks: [{ price: 52, volume: 1 }, { price: 54, volume: 3 }, { price: 56, volume: 6 }],
};

const rects = (calls: { name: string; args: unknown[] }[]) =>
  calls.filter((c) => c.name === 'fillRect').map((c) => c.args as number[]);

describe('depthBars', () => {
  it('adds up the levels away from the best price in cumulative mode', () => {
    const { bids, asks, max } = depthBars(book, 'cumulative');
    expect(bids.map((b) => b.value)).toEqual([2, 8, 10]);
    expect(asks.map((b) => b.value)).toEqual([1, 4, 10]);
    expect(max).toBe(10);
  });

  it('gives each level its own size in level mode', () => {
    const { bids, asks, max } = depthBars(book, 'level');
    expect(bids.map((b) => b.value)).toEqual([2, 6, 2]);
    expect(asks.map((b) => b.value)).toEqual([1, 3, 6]);
    expect(max).toBe(6);
  });

  it('does not trust the order a feed lists the levels in', () => {
    const shuffled: DepthData = { bids: [book.bids[2], book.bids[0], book.bids[1]], asks: [book.asks[2], book.asks[0], book.asks[1]] };
    expect(depthBars(shuffled, 'cumulative')).toEqual(depthBars(book, 'cumulative'));
  });

  it('leaves out levels that are not numbers or have no size', () => {
    const odd: DepthData = {
      bids: [{ price: 50, volume: 2 }, { price: NaN, volume: 4 }, { price: 49, volume: 0 }, { price: 48, volume: -1 }],
      asks: [{ price: 52, volume: Infinity }],
    };
    const { bids, asks, max } = depthBars(odd, 'level');
    expect(bids).toHaveLength(1);
    expect(asks).toHaveLength(0);
    expect(max).toBe(2);
  });
});

describe('DepthOverlay', () => {
  const on = { enabled: true, maxWidth: 100 };

  it('draws nothing while it is off or the book is empty', () => {
    const a = recordingCtx();
    new DepthOverlay().render(a.ctx, book, unitViewport, { maxWidth: 100 });
    expect(rects(a.calls)).toEqual([]);
    const b = recordingCtx();
    new DepthOverlay().render(b.ctx, { bids: [], asks: [] }, unitViewport, on);
    expect(rects(b.calls)).toEqual([]);
  });

  it('draws cumulative bars from the right edge, the biggest as wide as maxWidth', () => {
    const { ctx, calls } = recordingCtx();
    new DepthOverlay().render(ctx, book, unitViewport, on);
    const widths = rects(calls).map((r) => r[2]);
    expect(widths).toEqual([20, 80, 100, 10, 40, 100]);
    for (const r of rects(calls)) expect(r[0] + r[2]).toBe(1000);
  });

  it('draws the sizes of the levels in level mode, with a gap between the bars', () => {
    const { ctx, calls } = recordingCtx();
    new DepthOverlay().render(ctx, book, unitViewport, { ...on, mode: 'level' });
    const r = rects(calls);
    r.map((x) => x[2]).forEach((w, i) => expect(w).toBeCloseTo([100 * 2 / 6, 100, 100 * 2 / 6, 100 / 6, 50, 100][i]));
    // Levels are 2 px apart: bars 1 px high leave a gap, and sit centred on their price.
    expect(r[0][3]).toBe(1);
    expect(r[0][1]).toBeCloseTo(50 - 0.5);
  });

  it('keeps to the plot when maxWidth is wider than it', () => {
    const { ctx, calls } = recordingCtx();
    new DepthOverlay().render(ctx, book, { ...unitViewport, chartRect: { ...unitViewport.chartRect, width: 60 } }, { ...on, maxWidth: 500 });
    expect(Math.max(...rects(calls).map((r) => r[2]))).toBe(60);
  });

  it('skips levels off the plot', () => {
    const { ctx, calls } = recordingCtx();
    new DepthOverlay().render(ctx, book, { ...unitViewport, priceRange: { min: 49, max: 100 } }, on);
    // Only the best bid (50) and the asks are inside 49..100.
    expect(rects(calls)).toHaveLength(4);
  });

  it('marks the best bid and the best ask when asked to', () => {
    const plain = recordingCtx();
    new DepthOverlay().render(plain.ctx, book, unitViewport, on);
    const marked = recordingCtx();
    new DepthOverlay().render(marked.ctx, book, unitViewport, { ...on, markBest: true });
    const extra = rects(marked.calls).slice(rects(plain.calls).length);
    expect(extra).toHaveLength(2);
    // Each a 1 px line the width of the overlay, at the level's price.
    expect(extra.map((r) => [r[0], r[2], r[3]])).toEqual([[900, 100, 1], [900, 100, 1]]);
    expect(extra[0][1] + 0.5).toBe(50);
    expect(extra[1][1] + 0.5).toBe(48);
  });
});

describe('rows of a set price size (rowSize)', () => {
  const fine: DepthData = {
    bids: [{ price: 50, volume: 2 }, { price: 49.6, volume: 1 }, { price: 49.4, volume: 3 }, { price: 47, volume: 6 }],
    asks: [{ price: 50.6, volume: 1 }, { price: 51.2, volume: 2 }],
  };

  it('adds up the levels that fall in each row, the row centred on a multiple of rowSize', () => {
    const { bids, asks, max } = depthBars(fine, 'level', 1);
    expect(bids).toEqual([{ price: 50, value: 3 }, { price: 49, value: 3 }, { price: 47, value: 6 }]);
    expect(asks).toEqual([{ price: 51, value: 3 }]);
    expect(max).toBe(6);
    expect(depthBars(fine, 'cumulative', 1).bids.map((b) => b.value)).toEqual([3, 6, 12]);
  });

  it('puts a level on a row edge by the rule, though the division misses the half', () => {
    // 0.15 / 0.1 is 1.4999999999999998 in floating point.
    const edge: DepthData = { bids: [{ price: 0.15, volume: 1 }], asks: [{ price: 0.15, volume: 1 }] };
    const { bids, asks } = depthBars(edge, 'level', 0.1);
    expect(bids[0].price).toBeCloseTo(0.1);
    expect(asks[0].price).toBeCloseTo(0.2);
  });

  it('ignores a rowSize that is not a positive number', () => {
    for (const rowSize of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(depthBars(fine, 'level', rowSize)).toEqual(depthBars(fine, 'level'));
    }
  });

  it('draws each row as tall as its price size, whatever the gaps between levels', () => {
    const gappy: DepthData = { bids: [{ price: 50, volume: 1 }, { price: 46, volume: 1 }], asks: [] };
    const { ctx, calls } = recordingCtx();
    new DepthOverlay().render(ctx, gappy, unitViewport, { enabled: true, maxWidth: 100, rowSize: 2 });
    // One price unit is one pixel: a row of 2 is 2 px, from 51 down to 49.
    expect(rects(calls).map((r) => [r[1], r[3]].map((v) => Math.round(v * 1e6) / 1e6))).toEqual([[49, 2], [53, 2]]);
  });

  it('leaves a hairline between rows of single levels when they are tall enough', () => {
    const { ctx, calls } = recordingCtx();
    new DepthOverlay().render(ctx, book, unitViewport, { enabled: true, maxWidth: 100, rowSize: 4, mode: 'level' });
    for (const r of rects(calls)) expect(r[3]).toBeCloseTo(3);
  });

  it('marks the best bid and ask at their rows', () => {
    const { ctx, calls } = recordingCtx();
    new DepthOverlay().render(ctx, fine, unitViewport, { enabled: true, maxWidth: 100, rowSize: 1, markBest: true });
    const lines = rects(calls).filter((r) => r[3] === 1 && r[2] === 100 && r[0] === 900);
    expect(lines.map((r) => r[1] + 0.5).slice(-2)).toEqual([50, 49]);
  });
});

describe('rows from an origin (rowOrigin)', () => {
  // A footprint of 4 ticks of 0.25 a row: its rows start at multiples of 1, each tick centred on its price.
  const ticks: DepthData = {
    bids: [{ price: 50, volume: 1 }, { price: 49.75, volume: 2 }, { price: 49, volume: 3 }],
    asks: [{ price: 50.25, volume: 4 }, { price: 50.75, volume: 1 }, { price: 51, volume: 5 }],
  };
  const round = (bars: { price: number; value: number }[]) => bars.map((b) => ({ price: Math.round(b.price * 1e9) / 1e9, value: b.value }));

  it('adds the levels up into rows that start at origin + k · rowSize, each bar at its row middle', () => {
    const { bids, asks } = depthBars(ticks, 'level', 1, -0.125);
    expect(round(bids)).toEqual([{ price: 50.375, value: 1 }, { price: 49.375, value: 5 }]);
    expect(round(asks)).toEqual([{ price: 50.375, value: 5 }, { price: 51.375, value: 5 }]);
  });

  it('puts a level on a row start in that row, through the division error', () => {
    const edge: DepthData = { bids: [{ price: 0.3, volume: 1 }], asks: [{ price: 0.3, volume: 1 }] };
    // (0.3 - 0) / 0.1 is 2.9999999999999996 in floating point.
    const { bids, asks } = depthBars(edge, 'level', 0.1, 0);
    expect(bids[0].price).toBeCloseTo(0.35);
    expect(asks[0].price).toBeCloseTo(0.35);
  });

  it('draws each row over exactly its span', () => {
    const one: DepthData = { bids: [{ price: 50, volume: 1 }], asks: [] };
    const { ctx, calls } = recordingCtx();
    new DepthOverlay().render(ctx, one, unitViewport, { enabled: true, maxWidth: 100, rowSize: 2, rowOrigin: 0 });
    // The row [50, 52): one price unit is one pixel, so from y 48 down 2 px.
    expect(rects(calls).map((r) => [r[1], r[3]].map((v) => Math.round(v * 1e6) / 1e6))).toEqual([[48, 2]]);
  });

  it('leaves rows centred when the origin is no finite number, and does nothing without a rowSize', () => {
    for (const origin of [Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(depthBars(ticks, 'level', 1, origin)).toEqual(depthBars(ticks, 'level', 1));
    }
    expect(depthBars(ticks, 'level', undefined, -0.125)).toEqual(depthBars(ticks, 'level'));
  });

  it('draws anew when only the origin changes', () => {
    const overlay = new DepthOverlay();
    const first = recordingCtx();
    overlay.render(first.ctx, ticks, unitViewport, { enabled: true, maxWidth: 100, rowSize: 1 });
    const second = recordingCtx();
    overlay.render(second.ctx, ticks, unitViewport, { enabled: true, maxWidth: 100, rowSize: 1, rowOrigin: -0.125 });
    expect(rects(second.calls)).not.toEqual(rects(first.calls));
  });
});
