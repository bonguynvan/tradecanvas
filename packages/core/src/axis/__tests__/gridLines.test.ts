import { describe, it, expect } from 'vitest';
import type { ViewportState } from '@tradecanvas/commons';
import { gridLines } from '../gridLines.js';

const viewport = (over: Partial<ViewportState> = {}): ViewportState => ({
  chartRect: { x: 0, y: 0, width: 400, height: 200 },
  priceRange: { min: 0, max: 100 },
  barWidth: 8,
  barSpacing: 2,
  offset: 0,
  visibleRange: { from: 0, to: 39 },
  ...over,
} as ViewportState);

describe('gridLines', () => {
  it('puts a line across at each price step, on the pixel centre', () => {
    const { horizontal } = gridLines(viewport());
    // 0..100 in steps of 10: prices 0, 10, …, 100 at y 200, 180, …, 0.
    expect(horizontal).toEqual([200.5, 180.5, 160.5, 140.5, 120.5, 100.5, 80.5, 60.5, 40.5, 20.5, 0.5]);
  });

  it('puts a line down every 80 pixels or more, on whole slots', () => {
    const { vertical } = gridLines(viewport());
    // 10 px a slot → every 8th slot, from the first bar's centre (x 4), to
    // the slot just past the right edge.
    expect(vertical).toEqual([4.5, 84.5, 164.5, 244.5, 324.5, 404.5]);
  });

  it('follows the scroll offset, past the end of the data too', () => {
    const { vertical } = gridLines(viewport({ offset: 35 }));
    // Slots 3 .. 44 in view; lines at slots 8, 16, 24, 32, 40.
    expect(vertical).toEqual([49.5, 129.5, 209.5, 289.5, 369.5]);
  });

  it('draws nothing for a flat price range', () => {
    expect(gridLines(viewport({ priceRange: { min: 50, max: 50 } }))).toEqual({ horizontal: [], vertical: [] });
  });
});
