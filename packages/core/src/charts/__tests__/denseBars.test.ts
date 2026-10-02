import { describe, it, expect } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { forEachPixelColumn, isDense, DENSE_BAR_WIDTH } from '../denseBars.js';

const bar = (open: number, high: number, low: number, close: number, volume = 1): OHLCBar =>
  ({ time: 0, open, high, low, close, volume });

describe('forEachPixelColumn', () => {
  it('merges the bars that land on one pixel column into one bar', () => {
    const data = [bar(10, 12, 9, 11, 5), bar(11, 15, 10, 14, 2), bar(14, 14, 8, 9, 7), bar(9, 10, 9, 10, 1)];
    // Bars 0–2 land on column 0, bar 3 on column 1.
    const xs = [0.1, 0.4, 0.9, 1.2];
    const cols: Array<{ x: number; open: number; high: number; low: number; close: number; volume: number }> = [];
    forEachPixelColumn(data, 0, 3, (i) => xs[i], (c) => cols.push({ ...c }));
    expect(cols).toEqual([
      { x: 0, open: 10, high: 15, low: 8, close: 9, volume: 7 },
      { x: 1, open: 9, high: 10, low: 9, close: 10, volume: 1 },
    ]);
  });

  it('only walks the requested bars, and stops at the end of the data', () => {
    const data = [bar(1, 1, 1, 1), bar(2, 2, 2, 2), bar(3, 3, 3, 3)];
    const seen: number[] = [];
    forEachPixelColumn(data, 1, 10, (i) => i * 5, (c) => seen.push(c.open));
    expect(seen).toEqual([2, 3]);
  });

  it('visits nothing for an empty range', () => {
    let calls = 0;
    forEachPixelColumn([bar(1, 1, 1, 1)], 2, 1, (i) => i, () => calls++);
    expect(calls).toBe(0);
  });
});

describe('isDense', () => {
  it('switches below one pixel per bar', () => {
    expect(isDense({ barWidth: DENSE_BAR_WIDTH } as never)).toBe(false);
    expect(isDense({ barWidth: DENSE_BAR_WIDTH * 0.9 } as never)).toBe(true);
  });
});
