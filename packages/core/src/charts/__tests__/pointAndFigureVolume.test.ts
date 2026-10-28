import { describe, it, expect } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { toPointAndFigure } from '../transforms/pointAndFigure.js';

/** Bars closing at each price, each with a volume of 10 times its index plus one. */
const bars = (closes: number[]): OHLCBar[] =>
  closes.map((c, i) => ({ time: i * 60_000, open: c, high: c, low: c, close: c, volume: 10 * (i + 1) }));

describe('point & figure volume', () => {
  it('gives each column the volume of the bars it was made of, the forming one too', () => {
    // Up from 100 to 104, down to 100 (a reversal of 3 boxes of 1), up again to 104.
    const data = bars([100, 101, 102, 103, 104, 103, 102, 101, 100, 101, 102, 103, 104]);
    const columns = toPointAndFigure(data, 1, 3);
    const total = data.reduce((s, b) => s + b.volume, 0);
    expect(columns.reduce((s, c) => s + c.volume, 0)).toBe(total);
    expect(columns[columns.length - 1].volume).toBeGreaterThan(0);
  });
});
