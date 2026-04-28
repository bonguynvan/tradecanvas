import { describe, it, expect } from 'vitest';
import { TrendLineTool } from '../tools/TrendLine.js';
import { HorizontalLineTool } from '../tools/HorizontalLine.js';
import { RectangleTool } from '../tools/Rectangle.js';
import { drawing, unitViewport } from './fixtures.js';

describe('TrendLineTool.hitTest', () => {
  const tool = new TrendLineTool();

  it('hits a point lying on the segment between two anchors', () => {
    // anchors map to pixels (5, 50) and (105, 20). Midpoint ≈ (55, 35).
    const state = drawing('trendLine', [
      { time: 0, price: 50 },
      { time: 10, price: 80 },
    ]);
    expect(tool.hitTest({ x: 55, y: 35 }, state, unitViewport, 3)).toBe(true);
  });

  it('misses a point well off the line', () => {
    const state = drawing('trendLine', [
      { time: 0, price: 50 },
      { time: 10, price: 80 },
    ]);
    expect(tool.hitTest({ x: 55, y: 90 }, state, unitViewport, 3)).toBe(false);
  });

  it('does not extend past the segment (segment-bounded, not infinite line)', () => {
    const state = drawing('trendLine', [
      { time: 0, price: 50 },
      { time: 10, price: 50 },
    ]);
    // y=50 line ends at x=105; query well past that should miss.
    expect(tool.hitTest({ x: 500, y: 50 }, state, unitViewport, 3)).toBe(false);
  });

  it('returns false when the drawing has fewer than two anchors', () => {
    const state = drawing('trendLine', [{ time: 0, price: 50 }]);
    expect(tool.hitTest({ x: 5, y: 50 }, state, unitViewport, 3)).toBe(false);
  });
});

describe('HorizontalLineTool.hitTest', () => {
  const tool = new HorizontalLineTool();

  it('hits any x within the chart at the configured price y', () => {
    const state = drawing('horizontalLine', [{ time: 0, price: 30 }]);
    // priceToY(30) = 100 - 30 = 70.
    expect(tool.hitTest({ x: 5, y: 70 }, state, unitViewport, 2)).toBe(true);
    expect(tool.hitTest({ x: 800, y: 71 }, state, unitViewport, 2)).toBe(true);
  });

  it('misses when the y is outside tolerance', () => {
    const state = drawing('horizontalLine', [{ time: 0, price: 30 }]);
    expect(tool.hitTest({ x: 100, y: 50 }, state, unitViewport, 2)).toBe(false);
  });

  it('only hits inside the chart rect horizontally', () => {
    const state = drawing('horizontalLine', [{ time: 0, price: 30 }]);
    expect(tool.hitTest({ x: -5, y: 70 }, state, unitViewport, 2)).toBe(false);
    expect(tool.hitTest({ x: 1500, y: 70 }, state, unitViewport, 2)).toBe(false);
  });
});

describe('RectangleTool.hitTest', () => {
  const tool = new RectangleTool();

  // Anchors (0, 50) → (5, 50); (10, 20) → (105, 80). Rect spans x 5..105, y 50..80.

  it('hits the border of an unfilled rectangle', () => {
    const state = drawing(
      'rectangle',
      [
        { time: 0, price: 50 },
        { time: 10, price: 20 },
      ],
      { style: { color: '#000', lineWidth: 1, lineStyle: 'solid', fillColor: undefined } },
    );
    // Right edge ≈ x=105.
    expect(tool.hitTest({ x: 105, y: 65 }, state, unitViewport, 2)).toBe(true);
  });

  it('rejects points well outside the rectangle', () => {
    const state = drawing('rectangle', [
      { time: 0, price: 50 },
      { time: 10, price: 20 },
    ]);
    expect(tool.hitTest({ x: 500, y: 65 }, state, unitViewport, 2)).toBe(false);
    expect(tool.hitTest({ x: 50, y: 5 }, state, unitViewport, 2)).toBe(false);
  });

  it('hits the interior when the rectangle has a fill color', () => {
    const state = drawing(
      'rectangle',
      [
        { time: 0, price: 50 },
        { time: 10, price: 20 },
      ],
      {
        style: {
          color: '#000',
          lineWidth: 1,
          lineStyle: 'solid',
          fillColor: 'rgba(0,0,0,0.1)',
        },
      },
    );
    expect(tool.hitTest({ x: 50, y: 65 }, state, unitViewport, 2)).toBe(true);
  });

  it('does not hit interior of an unfilled rectangle', () => {
    const state = drawing(
      'rectangle',
      [
        { time: 0, price: 50 },
        { time: 10, price: 20 },
      ],
      {
        style: { color: '#000', lineWidth: 1, lineStyle: 'solid', fillColor: undefined },
      },
    );
    expect(tool.hitTest({ x: 50, y: 65 }, state, unitViewport, 2)).toBe(false);
  });
});
