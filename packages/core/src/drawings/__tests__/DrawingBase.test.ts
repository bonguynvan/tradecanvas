import { describe, it, expect } from 'vitest';
import type { DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';
import { drawing, unitViewport } from './fixtures.js';

class TestDrawing extends DrawingBase {
  descriptor = { type: 'trendLine' as const, name: 'Test', requiredAnchors: 2 };
  render(): void {}
  hitTest(): boolean {
    return false;
  }
  // Public passthroughs for testing protected helpers.
  publicDistanceToLine(p: Point, p1: Point, p2: Point): number {
    return this.distanceToLine(p, p1, p2);
  }
  publicDistanceToInfiniteLine(p: Point, p1: Point, p2: Point): number {
    return this.distanceToInfiniteLine(p, p1, p2);
  }
  publicAnchorToPixel(anchor: { time: number; price: number }, viewport: ViewportState): Point {
    return this.anchorToPixel(anchor, viewport);
  }
}

describe('DrawingBase.distanceToLine (segment)', () => {
  const tool = new TestDrawing();

  it('returns 0 when point lies on the segment', () => {
    expect(tool.publicDistanceToLine({ x: 5, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(0);
  });

  it('measures perpendicular distance to the segment interior', () => {
    expect(tool.publicDistanceToLine({ x: 5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(3);
  });

  it('clamps to the nearer endpoint when projection falls outside the segment', () => {
    expect(
      tool.publicDistanceToLine({ x: -5, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 }),
    ).toBe(5);
    expect(
      tool.publicDistanceToLine({ x: 20, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 }),
    ).toBe(10);
  });

  it('handles a degenerate zero-length segment without dividing by zero', () => {
    const d = tool.publicDistanceToLine({ x: 3, y: 4 }, { x: 0, y: 0 }, { x: 0, y: 0 });
    expect(d).toBe(5);
  });
});

describe('DrawingBase.distanceToInfiniteLine', () => {
  const tool = new TestDrawing();

  it('extends past the segment endpoints (distance to extrapolated line)', () => {
    // Horizontal line y=0; point at (-50, 7) is still 7 units away.
    expect(
      tool.publicDistanceToInfiniteLine({ x: -50, y: 7 }, { x: 0, y: 0 }, { x: 10, y: 0 }),
    ).toBeCloseTo(7);
  });

  it('returns endpoint distance for a degenerate line', () => {
    expect(
      tool.publicDistanceToInfiniteLine({ x: 3, y: 4 }, { x: 0, y: 0 }, { x: 0, y: 0 }),
    ).toBe(5);
  });
});

describe('DrawingBase.hitTestAnchor', () => {
  const tool = new TestDrawing();

  it('returns the anchor index when the point is within tolerance of an anchor', () => {
    const state: DrawingState = drawing('trendLine', [
      { time: 0, price: 50 },
      { time: 10, price: 80 },
    ]);
    // anchor 0 maps to (5, 50); anchor 1 to (105, 20).
    expect(tool.hitTestAnchor({ x: 6, y: 51 }, state, unitViewport, 5)).toBe(0);
    expect(tool.hitTestAnchor({ x: 104, y: 22 }, state, unitViewport, 5)).toBe(1);
  });

  it('returns -1 when the point is outside tolerance of every anchor', () => {
    const state: DrawingState = drawing('trendLine', [
      { time: 0, price: 50 },
      { time: 10, price: 80 },
    ]);
    expect(tool.hitTestAnchor({ x: 500, y: 50 }, state, unitViewport, 5)).toBe(-1);
  });
});

describe('DrawingBase timestamp-based anchors (timeframe switch)', () => {
  // Regression test for the "drawing drifts when switching timeframes" bug.
  // When `viewport.data` is provided, anchor.time is interpreted as a real
  // timestamp. Switching timeframes (replacing the bar series) keeps the
  // drawing visually pinned to the same wall-clock time.
  const tool = new TestDrawing();

  // 1m bars: time = 1000, 1060, 1120, ... at indices 0..99
  const bars1m = Array.from({ length: 100 }, (_, i) => ({ time: 1000 + i * 60 }));
  // 5m bars: time = 1000, 1300, 1600, ... at indices 0..19
  const bars5m = Array.from({ length: 20 }, (_, i) => ({ time: 1000 + i * 300 }));

  it('maps a timestamp anchor to the same pixel position on 1m and 5m bars', () => {
    const anchorTime = 1000 + 25 * 60; // = 2500 — bar 25 on 1m, falls inside bar 5 of 5m
    const vp1m: ViewportState = { ...unitViewport, data: bars1m };
    const vp5m: ViewportState = { ...unitViewport, data: bars5m };

    const px1m = tool.publicAnchorToPixel({ time: anchorTime, price: 50 }, vp1m);
    const px5m = tool.publicAnchorToPixel({ time: anchorTime, price: 50 }, vp5m);

    // 1m: bar index 25 → x = 25*10 + 5 = 255
    expect(px1m.x).toBe(255);
    // 5m: bar 5 covers t=2500 (start), so timestampToBarIndex returns 5 → x = 5*10 + 5 = 55
    expect(px5m.x).toBe(55);
    // The crucial property: both pixel positions correspond to the same
    // wall-clock anchor time, even though the underlying bar series changed.
  });

  it('falls back to legacy bar-index behavior when viewport.data is absent', () => {
    const px = tool.publicAnchorToPixel({ time: 10, price: 50 }, unitViewport);
    // Without data, anchor.time IS the bar index — bar 10 → x = 10*10 + 5 = 105.
    expect(px.x).toBe(105);
  });
});
