import { describe, it, expect } from 'vitest';
import { Viewport } from '../Viewport.js';
import type { OHLCBar } from '@tradecanvas/commons';
import { PRICE_AXIS_WIDTH } from '@tradecanvas/commons';

/** Minimal ascending bars, one per minute — only `time`/`close` matter to `Viewport`. */
function bars(n: number): OHLCBar[] {
  return Array.from({ length: n }, (_, i) => ({
    time: i * 60_000,
    open: 100,
    high: 100,
    low: 100,
    close: 100,
    volume: 0,
  }));
}

describe('Viewport — sparse-series panning (2026-08-27)', () => {
  it('locked a short series to one offset before the fix — regression guard for the fix itself', () => {
    // 3 bars at the default 10px/bar unit can't come close to filling a 1000px pane, so this is
    // squarely the "short data" branch of clampOffset — the case reported as "can't drag Year".
    const vp = new Viewport(1000, 600, 2, 30, 5);
    vp.updateData(bars(3), false);
    const before = vp.getState().offset;

    vp.scrollBy(-200);
    const after = vp.getState().offset;

    expect(after).not.toBe(before);
  });

  it('rests within half a viewport of the old right-aligned lock, not thrown far away', () => {
    // Before the fix, `updateData` on a fresh Viewport (offset starts at 0) forced offset to
    // EXACTLY `endOffset` via `clamp(0, endOffset, endOffset)`. Now it clamps that same starting
    // `0` into a real `[endOffset - play, endOffset + play]` range instead of a single point — for
    // a brand-new chart (offset still 0), `0` sits above the new `maxOffset`, so it lands at
    // `endOffset + play`, not `endOffset` itself. Still close to the old resting spot (within one
    // `play` — half a viewport), never arbitrarily far off, and callers that want the OLD exact
    // right-aligned snap on a fresh series still get it from an explicit `scrollToEnd()` call.
    const vp = new Viewport(1000, 600, 2, 30, 5);
    vp.setPanLimits({ freePan: false }); // the pre-1.3 clamp this test describes
    vp.updateData(bars(3), false);
    const state = vp.getState();
    const barUnit = state.barWidth + state.barSpacing;
    const rightMarginPx = 5 * barUnit;
    const endOffset = 3 * barUnit - state.chartRect.width + rightMarginPx;
    const play = state.chartRect.width * 0.5;

    expect(Math.abs(state.offset - endOffset)).toBeLessThanOrEqual(play + 1e-6);
  });

  it('a large drag on a short series stays clamped to a real (non-degenerate) range, not thrown to Infinity', () => {
    const vp = new Viewport(1000, 600, 2, 30, 5);
    vp.updateData(bars(3), false);

    vp.scrollBy(-1_000_000);
    const min = vp.getState().offset;
    vp.scrollBy(2_000_000);
    const max = vp.getState().offset;

    expect(Number.isFinite(min)).toBe(true);
    expect(Number.isFinite(max)).toBe(true);
    expect(max).toBeGreaterThan(min);
  });
});

describe('Viewport.panPriceRange — vertical chart-body panning', () => {
  it('a drag UP (positive delta) slides the price window DOWN, span preserved', () => {
    const vp = new Viewport(1000, 600, 2, 30, 5);
    vp.updateData(bars(10), false);
    vp.setPriceRange(100, 200);
    const h = vp.getState().chartRect.height;

    vp.panPriceRange(h / 2); // dragged up half the pane

    const { min, max } = vp.getState().priceRange;
    expect(max - min).toBeCloseTo(100, 6); // span unchanged
    expect(min).toBeCloseTo(50, 6); // shifted down by half the range (50)
    expect(max).toBeCloseTo(150, 6);
  });

  it('a drag DOWN (negative delta) slides the price window UP', () => {
    const vp = new Viewport(1000, 600, 2, 30, 5);
    vp.updateData(bars(10), false);
    vp.setPriceRange(100, 200);
    const h = vp.getState().chartRect.height;

    vp.panPriceRange(-h / 4);

    const { min, max } = vp.getState().priceRange;
    expect(min).toBeCloseTo(125, 6);
    expect(max).toBeCloseTo(225, 6);
  });

  it('moves the candles with the pointer on an inverted scale too', () => {
    const vp = new Viewport(1000, 600, 2, 30, 5);
    vp.updateData(bars(10), false);
    vp.setPriceRange(100, 200);
    vp.setInvertScale(true);
    const h = vp.getState().chartRect.height;

    // Dragged up: upside down, higher prices come into view from below.
    vp.panPriceRange(h / 2);

    expect(vp.getState().priceRange.min).toBeCloseTo(150, 6);
    expect(vp.getState().priceRange.max).toBeCloseTo(250, 6);
  });

  it('is a no-op for a zero delta', () => {
    const vp = new Viewport(1000, 600, 2, 30, 5);
    vp.updateData(bars(10), false);
    vp.setPriceRange(100, 200);

    vp.panPriceRange(0);

    expect(vp.getState().priceRange).toEqual({ min: 100, max: 200 });
  });

  it('shifts multiplicatively on a log scale (equal pixel travel = equal ratio)', () => {
    const vp = new Viewport(1000, 600, 2, 30, 5);
    vp.updateData(bars(10), false);
    vp.setLogScale(true);
    vp.setPriceRange(10, 1000);
    const h = vp.getState().chartRect.height;

    vp.panPriceRange(h); // one full pane up

    const { min, max } = vp.getState().priceRange;
    // log-span (log10 → 2 decades) is preserved; both bounds divided by the same factor
    expect(Math.log(max) - Math.log(min)).toBeCloseTo(Math.log(1000) - Math.log(10), 6);
    expect(min).toBeLessThan(10);
    expect(max).toBeLessThan(1000);
    expect(max / min).toBeCloseTo(100, 6);
  });
});

describe('Viewport.getState — caching', () => {
  it('returns the same object reference across repeated calls with no mutation in between', () => {
    const vp = new Viewport(1000, 600, 2, 30, 5);
    vp.updateData(bars(10), false);

    const a = vp.getState();
    const b = vp.getState();
    expect(a).toBe(b);
  });

  it('returns a fresh object after scrollBy, even when clamping snaps the value back', () => {
    // The object identity must change on every mutation regardless of
    // whether clampOffset happens to land back on the same numeric value
    // (e.g. a short series already resting at its clamp boundary) — a
    // stale cached reference would be the real bug to catch here.
    const vp = new Viewport(1000, 600, 2, 30, 5);
    vp.updateData(bars(500), false); // long series, not clamp-pinned
    const before = vp.getState();

    vp.scrollBy(5);

    const after = vp.getState();
    expect(after).not.toBe(before);
    expect(after.offset).not.toBe(before.offset);
  });

  it('returns a fresh object after setPriceRange', () => {
    const vp = new Viewport(1000, 600, 2, 30, 5);
    vp.updateData(bars(10), false);
    const before = vp.getState();

    vp.setPriceRange(10, 20);

    const after = vp.getState();
    expect(after).not.toBe(before);
    expect(after.priceRange).toEqual({ min: 10, max: 20 });
  });

  it('returns a fresh object after zoom', () => {
    const vp = new Viewport(1000, 600, 2, 30, 5);
    vp.updateData(bars(10), false);
    const before = vp.getState();

    vp.zoom(0.5, 500);

    const after = vp.getState();
    expect(after).not.toBe(before);
  });

  it('returns a fresh object after setChartRect / resize', () => {
    const vp = new Viewport(1000, 600, 2, 30, 5);
    vp.updateData(bars(10), false);
    const before = vp.getState();

    vp.resize(1200, 700);

    const after = vp.getState();
    expect(after).not.toBe(before);
    expect(after.chartRect.width).not.toBe(before.chartRect.width);
  });

  it('returns a fresh object after panPriceRange', () => {
    const vp = new Viewport(1000, 600, 2, 30, 5);
    vp.updateData(bars(10), false);
    vp.setPriceRange(100, 200);
    const before = vp.getState();

    vp.panPriceRange(10);

    const after = vp.getState();
    expect(after).not.toBe(before);
  });

  it('returns a fresh object after setScaleMode / setScaleBaseline', () => {
    const vp = new Viewport(1000, 600, 2, 30, 5);
    vp.updateData(bars(10), false);

    const before1 = vp.getState();
    vp.setScaleMode('logarithmic');
    const after1 = vp.getState();
    expect(after1).not.toBe(before1);
    expect(after1.scaleMode).toBe('logarithmic');

    vp.setScaleBaseline(42);
    const after2 = vp.getState();
    expect(after2).not.toBe(after1);
    expect(after2.scaleBaseline).toBe(42);
  });

  it('a subsequent updateData with autoScale on produces a fresh snapshot', () => {
    const vp = new Viewport(1000, 600, 2, 30, 5);
    vp.updateData(bars(10), true);
    const before = vp.getState();

    vp.updateData(bars(20), true);

    const after = vp.getState();
    expect(after).not.toBe(before);
  });
});

describe('Viewport — long-data panning with freePan: false (regression guard)', () => {
  it('keeps the pre-1.3 clamp when free panning is turned off', () => {
    // 500 bars at up to 30px/bar comfortably overflows a 1000px pane — squarely the "long data"
    // branch of the legacy clamp.
    const vp = new Viewport(1000, 600, 2, 30, 5);
    vp.setPanLimits({ freePan: false });
    vp.updateData(bars(500), false);
    vp.zoom(1, 500); // widen bars so the series overflows even at a small bar count
    const state = vp.getState();
    const barUnit = state.barWidth + state.barSpacing;
    const rightMarginPx = 5 * barUnit;
    const endOffset = 500 * barUnit - state.chartRect.width + rightMarginPx;

    expect(endOffset).toBeGreaterThan(0); // sanity: this test is actually exercising the long branch

    vp.scrollBy(1_000_000);
    expect(vp.getState().offset).toBeCloseTo(endOffset, 6);

    vp.scrollBy(-1_000_000);
    expect(vp.getState().offset).toBeCloseTo(-(state.chartRect.width * 0.5), 6);
  });
});

describe('Viewport — price axis width', () => {
  it('reserves the default axis width, then a widened one, and reports it in snapshots', () => {
    const vp = new Viewport(800, 400);
    expect(vp.getState().chartRect.width).toBe(800 - PRICE_AXIS_WIDTH);
    expect(vp.getState().priceAxisWidth).toBeUndefined();

    vp.setPriceAxisWidth(96);
    expect(vp.getState().priceAxisWidth).toBe(96);
    vp.resize(800, 400);
    expect(vp.getState().chartRect.width).toBe(800 - 96);
  });
});

describe('Viewport — free panning', () => {
  function longViewport(): { vp: Viewport; unit: number; width: number } {
    const vp = new Viewport(1000, 600, 2, 30, 5);
    vp.updateData(bars(500), false);
    vp.scrollToEnd();
    const s = vp.getState();
    return { vp, unit: s.barWidth + s.barSpacing, width: s.chartRect.width };
  }

  it('drags past the newest bar into empty future space, down to 3 visible bars', () => {
    const { vp, unit } = longViewport();
    vp.scrollBy(1_000_000);
    // Offset puts bar 497 at the left edge: bars 497–499 visible, the rest is future.
    expect(vp.getState().offset).toBeCloseTo(497 * unit, 6);
    expect(vp.getState().visibleRange).toEqual({ from: 497, to: 499 });
  });

  it('drags past the oldest bar until only 3 bars remain at the right edge', () => {
    const { vp, unit, width } = longViewport();
    vp.scrollBy(-1_000_000);
    expect(vp.getState().offset).toBeCloseTo(3 * unit - width, 6);
  });

  it('honours a custom minVisibleBars', () => {
    const { vp, unit } = longViewport();
    vp.setPanLimits({ minVisibleBars: 10 });
    vp.scrollBy(1_000_000);
    expect(vp.getState().offset).toBeCloseTo(490 * unit, 6);
  });

  it('does the same for a short series, whose bars already fit', () => {
    const vp = new Viewport(1000, 600, 2, 30, 5);
    vp.updateData(bars(3), false);
    vp.scrollToEnd();
    const s = vp.getState();
    const unit = s.barWidth + s.barSpacing;
    vp.scrollBy(1_000_000);
    expect(vp.getState().offset).toBeCloseTo(0, 6); // all 3 at the left edge
    vp.scrollBy(-1_000_000);
    expect(vp.getState().offset).toBeCloseTo(3 * unit - s.chartRect.width, 6);
  });

  it('is at the end only near the resting view — not when panned into the future', () => {
    const { vp, unit } = longViewport();
    expect(vp.isAtEnd()).toBe(true);
    vp.scrollBy(unit); // a bar into the future: still effectively live
    expect(vp.isAtEnd()).toBe(true);
    vp.scrollBy(20 * unit);
    expect(vp.isAtEnd()).toBe(false);
    vp.scrollToEnd();
    expect(vp.isAtEnd()).toBe(true);
  });

  it('zooming at the cursor stays within the same limits', () => {
    const { vp } = longViewport();
    vp.scrollBy(1_000_000);
    vp.zoom(-0.5, 0); // zoom out anchored at the left edge
    const s = vp.getState();
    const unit = s.barWidth + s.barSpacing;
    expect(s.offset).toBeLessThanOrEqual(497 * unit + 1e-6);
  });
});

describe('Viewport — following the live edge with free panning', () => {
  it('rests at the end once a fresh chart receives its first bars', () => {
    const vp = new Viewport(1000, 600, 2, 30, 5);
    vp.updateData(bars(1), false); // e.g. the first appendBar
    expect(vp.isAtEnd()).toBe(true);
    vp.updateData(bars(2), false);
    expect(vp.isAtEnd()).toBe(true);
  });

  it('keeps the newest bar pinned when zooming at the live edge', () => {
    const vp = new Viewport(1000, 600, 2, 30, 5);
    vp.updateData(bars(500), false);
    vp.scrollToEnd();
    vp.zoom(-0.2, 500);
    expect(vp.isAtEnd()).toBe(true);
    vp.zoom(0.5, 500);
    expect(vp.isAtEnd()).toBe(true);
  });

  it('zooms around the cursor as before when panned into history', () => {
    const vp = new Viewport(1000, 600, 2, 30, 5);
    vp.updateData(bars(500), false);
    vp.scrollToEnd();
    vp.scrollBy(-2000);
    vp.zoom(0.5, 500);
    expect(vp.isAtEnd()).toBe(false);
  });

  it('zoomToBarRange puts the requested slots edge to edge', () => {
    const vp = new Viewport(1000, 600, 2, 30, 5);
    vp.updateData(bars(500), false);
    vp.zoomToBarRange(100, 149); // 50 slots
    const s = vp.getState();
    const unit = s.barWidth + s.barSpacing;
    expect(unit).toBeCloseTo(s.chartRect.width / 50, 6);
    expect(s.offset).toBeCloseTo(100 * unit, 6);
  });
});
