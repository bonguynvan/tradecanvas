import { describe, it, expect } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { Viewport } from '../Viewport.js';

const bars = (n: number): OHLCBar[] =>
  Array.from({ length: n }, (_, i) => ({ time: i * 60_000, open: 100, high: 101, low: 99, close: 100, volume: 0 }));

/** Zoom in as far as the viewport lets it. */
function zoomAllTheWayIn(vp: Viewport): number {
  for (let i = 0; i < 200; i++) vp.zoom(0.5, 400);
  return vp.getState().barWidth;
}

describe('Viewport: how wide a bar may get', () => {
  it('stops at 30 px unless told otherwise', () => {
    const vp = new Viewport(1000, 600);
    vp.updateData(bars(500), false);
    expect(zoomAllTheWayIn(vp)).toBe(30);
  });

  it('zooms in further for a chart whose bars carry text, and comes back when it no longer does', () => {
    const vp = new Viewport(1000, 600);
    vp.updateData(bars(500), false);
    // A slot is a bar and its 2 px gap.
    vp.setMaxBarSlot(162);
    expect(zoomAllTheWayIn(vp)).toBe(160);
    // Back to the usual limit: the bars it had are narrowed to it at once.
    vp.setMaxBarSlot(null);
    expect(vp.getState().barWidth).toBe(30);
    expect(zoomAllTheWayIn(vp)).toBe(30);
  });

  it('counts the widest slot the same whatever share of it the bar takes', () => {
    const vp = new Viewport(1000, 600);
    vp.setBarLayout('golden');
    vp.updateData(bars(500), false);
    vp.setMaxBarSlot(162);
    zoomAllTheWayIn(vp);
    const { barWidth, barSpacing } = vp.getState();
    expect(barWidth + barSpacing).toBeCloseTo(162, 6);
  });

  it('can be put at a slot width, within its limits, resting at the newest bars', () => {
    const vp = new Viewport(1000, 600);
    vp.updateData(bars(500), false);
    vp.scrollBy(-3000);
    // A slot is a bar and its 2 px gap.
    vp.setBarSlot(22);
    expect(vp.getState().barWidth).toBe(20);
    expect(vp.isAtEnd()).toBe(true);
    vp.setBarSlot(86);
    expect(vp.getState().barWidth).toBe(30);
    vp.setMaxBarSlot(162);
    vp.setBarSlot(86);
    expect(vp.getState().barWidth).toBe(84);
    vp.setBarSlot(Number.NaN);
    expect(vp.getState().barWidth).toBe(84);
  });

  it('leaves no more room past the newest bar than at the usual widest bar', () => {
    // Five bars of room: 160 px at the usual widest slot (30 and a 2 px gap).
    const vp = new Viewport(1000, 600, 2, 30, 5);
    vp.updateData(bars(500), false);
    const room = () => {
      const { offset, barWidth, barSpacing, chartRect } = vp.getState();
      return chartRect.width - (500 * (barWidth + barSpacing) - offset);
    };
    vp.setBarSlot(32);
    expect(room()).toBeCloseTo(160, 6);
    vp.setMaxBarSlot(162);
    vp.setBarSlot(102);
    expect(room()).toBeCloseTo(160, 6);
    // Narrower bars: five of their own slots, as ever.
    vp.setBarSlot(10);
    expect(room()).toBeCloseTo(50, 6);
  });

  it('leaves a quarter of a narrow plot at most past the newest wide bar, so the bars stay on it', () => {
    // A phone: eight bars of room at the usual widest slot would be wider than the plot.
    const vp = new Viewport(390, 600, 2, 30, 8);
    vp.updateData(bars(500), false);
    vp.setMaxBarSlot(162);
    vp.setBarSlot(88);
    const { offset, barWidth, barSpacing, chartRect, visibleRange } = vp.getState();
    const room = chartRect.width - (500 * (barWidth + barSpacing) - offset);
    expect(room).toBeCloseTo(chartRect.width / 4, 6);
    // The newest bar is on view, and more than one of them.
    expect(visibleRange.to).toBeGreaterThanOrEqual(499);
    expect(visibleRange.to - visibleRange.from).toBeGreaterThanOrEqual(2);
    // A chart of candles keeps its room as it was: so many of its own slots, whatever the plot.
    const candles = new Viewport(390, 600, 2, 30, 8);
    candles.updateData(bars(500), false);
    candles.setBarSlot(32);
    const c = candles.getState();
    expect(c.chartRect.width - (500 * (c.barWidth + c.barSpacing) - c.offset)).toBeCloseTo(8 * 32, 6);
  });

  it('keeps the usual limit for a slot that is none, or no wider than the usual', () => {
    const vp = new Viewport(1000, 600);
    vp.updateData(bars(500), false);
    for (const px of [Number.NaN, -5, 0, 1, 20]) {
      vp.setMaxBarSlot(px);
      expect(zoomAllTheWayIn(vp), String(px)).toBe(30);
    }
  });
});
