import { describe, it, expect } from 'vitest';
import type { ViewportState } from '@tradecanvas/commons';
import { CircleTool } from '../tools/Circle.js';
import { DateAndPriceRangeTool, dateAndPriceRangeLines, volumeBetween } from '../tools/DateAndPriceRange.js';
import { CyclicLinesTool, cycleLineXs } from '../tools/CyclicLines.js';
import { PriceLabelTool } from '../tools/PriceLabel.js';
import { drawing, recordingCtx, unitViewport } from './fixtures.js';

const HOUR = 3_600_000;
const dataViewport: ViewportState = {
  ...unitViewport,
  data: Array.from({ length: 100 }, (_, i) => ({ time: i * HOUR, volume: 2 })),
};

describe('CircleTool', () => {
  const tool = new CircleTool();
  // Center (105, 50), edge (205, 50): radius 100.
  const outline = drawing('circle', [{ time: 10, price: 50 }, { time: 20, price: 50 }]);

  it('hits on the edge of an outline circle but not inside it', () => {
    expect(tool.hitTest({ x: 105, y: 150 }, outline, unitViewport, 2)).toBe(true);
    expect(tool.hitTest({ x: 120, y: 55 }, outline, unitViewport, 2)).toBe(false);
  });

  it('hits anywhere inside a filled circle', () => {
    const filled = drawing('circle', outline.anchors, { style: { color: '#fff', lineWidth: 1, lineStyle: 'solid', fillColor: '#4c8dff' } });
    expect(tool.hitTest({ x: 120, y: 55 }, filled, unitViewport, 2)).toBe(true);
  });

  it('draws a full circle of the measured radius', () => {
    const { ctx, calls } = recordingCtx();
    tool.render(ctx, outline, unitViewport, false);
    expect(calls.find((c) => c.name === 'arc')?.args).toEqual([105, 50, 100, 0, Math.PI * 2]);
  });
});

describe('DateAndPriceRangeTool', () => {
  const tool = new DateAndPriceRangeTool();

  it('measures price, bars and time, and sums the volume inside', () => {
    const state = drawing('dateAndPriceRange', [{ time: 0, price: 50 }, { time: 4 * HOUR, price: 60 }]);
    expect(volumeBetween(state, dataViewport)).toBe(10); // 5 bars × 2
    expect(dateAndPriceRangeLines(state, dataViewport)).toEqual(['+10.00 (+20.00%)', '4 bars, 4h', 'Vol 10']);
  });

  it('omits volume and time without a bar series', () => {
    const state = drawing('dateAndPriceRange', [{ time: 0, price: 50 }, { time: 4, price: 40 }]);
    expect(volumeBetween(state, unitViewport)).toBeNull();
    expect(dateAndPriceRangeLines(state, unitViewport)).toEqual(['-10.00 (-20.00%)', '4 bars']);
  });

  it('hits inside the box', () => {
    const state = drawing('dateAndPriceRange', [{ time: 0, price: 50 }, { time: 10, price: 70 }]);
    expect(tool.hitTest({ x: 50, y: 40 }, state, unitViewport, 2)).toBe(true);
    expect(tool.hitTest({ x: 300, y: 40 }, state, unitViewport, 2)).toBe(false);
  });

  it('renders its stats', () => {
    const state = drawing('dateAndPriceRange', [{ time: 0, price: 50 }, { time: 4 * HOUR, price: 60 }]);
    const { ctx, texts } = recordingCtx();
    tool.render(ctx, state, dataViewport, false);
    expect(texts).toContain('Vol 10');
  });
});

describe('CyclicLinesTool', () => {
  const tool = new CyclicLinesTool();

  it('repeats the A→B interval forward across the chart', () => {
    expect(cycleLineXs({ x: 5, y: 0 }, { x: 105, y: 0 }, unitViewport)).toEqual([5, 105, 205, 305, 405, 505, 605, 705, 805, 905]);
  });

  it('collapses to one line for a period too small to show', () => {
    expect(cycleLineXs({ x: 5, y: 0 }, { x: 6, y: 0 }, unitViewport)).toEqual([5]);
  });

  it('hits on any cycle line', () => {
    const state = drawing('cyclicLines', [{ time: 0, price: 50 }, { time: 10, price: 50 }]);
    expect(tool.hitTest({ x: 506, y: 10 }, state, unitViewport, 2)).toBe(true);
    expect(tool.hitTest({ x: 450, y: 10 }, state, unitViewport, 2)).toBe(false);
  });
});

describe('PriceLabelTool', () => {
  const tool = new PriceLabelTool();

  it('shows the anchored price by default, or custom text', () => {
    const { ctx, texts } = recordingCtx();
    tool.render(ctx, drawing('priceLabel', [{ time: 10, price: 42.5 }]), unitViewport, false);
    expect(texts).toEqual(['42.50']);

    const custom = recordingCtx();
    tool.render(custom.ctx, drawing('priceLabel', [{ time: 10, price: 42.5 }], {
      style: { color: '#fff', lineWidth: 1, lineStyle: 'solid', text: 'Entry' },
    }), unitViewport, false);
    expect(custom.texts).toEqual(['Entry']);
  });

  it('hits on the point and on the callout', () => {
    const state = drawing('priceLabel', [{ time: 10, price: 50 }]); // point (105, 50)
    expect(tool.hitTest({ x: 105, y: 50 }, state, unitViewport, 3)).toBe(true);
    // Callout sits up-right of the point: x from 119, y around 32.
    expect(tool.hitTest({ x: 125, y: 32 }, state, unitViewport, 2)).toBe(true);
    expect(tool.hitTest({ x: 105, y: 90 }, state, unitViewport, 2)).toBe(false);
  });
});
