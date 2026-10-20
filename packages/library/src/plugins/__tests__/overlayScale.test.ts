import { describe, it, expect } from 'vitest';
import type { DataSeries, ViewportState } from '@tradecanvas/commons';
import { overlayScale } from '../overlayScale.js';

const MIN = 60_000;
const data: DataSeries = Array.from({ length: 10 }, (_, i) => ({
  time: 1_000_000 + i * MIN, open: 100, high: 101, low: 99, close: 100, volume: 1,
}));

const viewport = (over: Partial<ViewportState> = {}): ViewportState => ({
  visibleRange: { from: 2, to: 8 },
  priceRange: { min: 90, max: 110 },
  barWidth: 6,
  barSpacing: 4,
  offset: 20,
  chartRect: { x: 10, y: 5, width: 600, height: 200 },
  ...over,
});

describe('overlayScale', () => {
  it('places a bar by its time where the chart draws it', () => {
    const s = overlayScale({ viewport: viewport(), data });
    // Bar 3: 3 × (6 + 4) − 20 + 10 + 3 = 23
    expect(s.indexToX(3)).toBe(23);
    expect(s.timeToX(data[3].time)).toBe(23);
    expect(s.xToIndex(23)).toBe(3);
    expect(s.xToTime(23)).toBe(data[3].time);
  });

  it('places a time between bars, and past the newest, in proportion', () => {
    const s = overlayScale({ viewport: viewport(), data });
    expect(s.timeToX(data[3].time + MIN / 2)).toBe(28);
    expect(s.timeToX(data[9].time + 2 * MIN)).toBe(s.indexToX(11));
  });

  it('maps prices both ways, on a log or upside-down scale too', () => {
    const linear = overlayScale({ viewport: viewport(), data });
    expect(linear.priceToY(110)).toBe(5);
    expect(linear.priceToY(90)).toBe(205);
    expect(linear.yToPrice(105)).toBe(100);

    const inverted = overlayScale({ viewport: viewport({ invertScale: true }), data });
    expect(inverted.priceToY(110)).toBe(205);

    const log = overlayScale({ viewport: viewport({ logScale: true, priceRange: { min: 10, max: 1000 } }), data });
    expect(log.priceToY(100)).toBeCloseTo(105);
    expect(log.yToPrice(105)).toBeCloseTo(100);
  });

  it('gives the bar width and the bars on screen, within the data', () => {
    const s = overlayScale({ viewport: viewport({ visibleRange: { from: -3, to: 40 } }), data });
    expect(s.barWidth).toBe(6);
    expect(s.visible).toEqual({ from: 0, to: 9 });
  });

  it('copes with no data', () => {
    const s = overlayScale({ viewport: viewport(), data: [] });
    expect(s.visible).toEqual({ from: 0, to: -1 });
    expect(s.timeToX(5)).toBe(s.indexToX(5));
  });
});
