import { describe, it, expect } from 'vitest';
import { Viewport, MIN_BAR_UNIT } from '../Viewport.js';
import type { OHLCBar } from '@tradecanvas/commons';

function bars(n: number): OHLCBar[] {
  return Array.from({ length: n }, (_, i) => ({
    time: i * 60_000, open: 100, high: 100, low: 100, close: 100, volume: 0,
  }));
}

const unitOf = (vp: Viewport) => {
  const s = vp.getState();
  return s.barWidth + s.barSpacing;
};

function zoomOutFully(vp: Viewport): void {
  for (let i = 0; i < 200; i++) vp.zoom(-0.2, 400);
}

describe('Viewport — zooming out past the old 2px + 2px floor', () => {
  it('zooms out until every bar fits when the data is wider than the chart', () => {
    const vp = new Viewport(1000, 600, 2, 30, 5);
    vp.updateData(bars(2000), false);
    vp.scrollToEnd();
    zoomOutFully(vp);
    const width = vp.getState().chartRect.width;
    expect(unitOf(vp)).toBeLessThan(4);
    expect(unitOf(vp)).toBeCloseTo(width / (2000 + 5), 6);
    const { from, to } = vp.getState().visibleRange;
    expect(from).toBe(0);
    expect(to).toBe(1999);
  });

  it('keeps the old floor when the bars already fit at it', () => {
    const vp = new Viewport(1000, 600, 2, 30, 5);
    vp.updateData(bars(100), false);
    zoomOutFully(vp);
    expect(vp.getState().barWidth).toBe(2);
    expect(vp.getState().barSpacing).toBe(2);
  });

  it('never goes below the minimum bar unit, however long the series', () => {
    const vp = new Viewport(1000, 600, 2, 30, 5);
    vp.updateData(bars(100_000), false);
    zoomOutFully(vp);
    expect(unitOf(vp)).toBeCloseTo(MIN_BAR_UNIT, 9);
  });

  it('shrinks the gap with the bar below the floor, and keeps the 2px gap above it', () => {
    const vp = new Viewport(1000, 600, 2, 30, 5);
    vp.updateData(bars(5000), false);
    zoomOutFully(vp);
    const dense = vp.getState();
    expect(dense.barSpacing).toBeCloseTo(dense.barWidth, 9);
    for (let i = 0; i < 200; i++) vp.zoom(0.2, 400);
    expect(vp.getState().barSpacing).toBe(2);
    expect(vp.getState().barWidth).toBe(30);
  });

  it('zooms back in through the floor without a jump', () => {
    const vp = new Viewport(1000, 600, 2, 30, 5);
    vp.updateData(bars(5000), false);
    zoomOutFully(vp);
    let prev = unitOf(vp);
    for (let i = 0; i < 40; i++) {
      vp.zoom(0.2, 400);
      const unit = unitOf(vp);
      expect(unit).toBeGreaterThanOrEqual(prev);
      expect(unit).toBeLessThanOrEqual(prev * 1.25 + 2);
      prev = unit;
    }
  });

  it('fits a long range edge to edge with zoomToBarRange', () => {
    const vp = new Viewport(1000, 600, 2, 30, 5);
    vp.updateData(bars(3000), false);
    vp.zoomToBarRange(0, 3004);
    const width = vp.getState().chartRect.width;
    expect(unitOf(vp)).toBeCloseTo(width / 3005, 6);
    expect(vp.getState().visibleRange.from).toBe(0);
  });

  it('raises a dense zoom back to the floor when a shorter series replaces it', () => {
    const vp = new Viewport(1000, 600, 2, 30, 5);
    vp.updateData(bars(5000), false);
    zoomOutFully(vp);
    vp.updateData(bars(200), false);
    expect(vp.getState().barWidth).toBe(2);
    expect(vp.getState().barSpacing).toBe(2);
  });
});

describe('Viewport.prependBars', () => {
  it('keeps the same bars on screen when older bars are added in front', () => {
    const vp = new Viewport(1000, 600, 2, 30, 5);
    vp.updateData(bars(500), false);
    vp.scrollBy(-1500);
    const before = vp.getState().visibleRange;
    vp.prependBars(200);
    vp.updateData(bars(700), false);
    const after = vp.getState().visibleRange;
    expect(after.from).toBe(before.from + 200);
    expect(after.to).toBe(before.to + 200);
  });

  it('stays at the live edge', () => {
    const vp = new Viewport(1000, 600, 2, 30, 5);
    vp.updateData(bars(500), false);
    vp.scrollToEnd();
    vp.prependBars(100);
    vp.updateData(bars(600), false);
    expect(vp.isAtEnd()).toBe(true);
  });
});
