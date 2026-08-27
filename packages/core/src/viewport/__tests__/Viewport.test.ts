import { describe, it, expect } from 'vitest';
import { Viewport } from '../Viewport.js';
import type { OHLCBar } from '@tradecanvas/commons';

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

  it('leaves long-data panning behaviour unchanged (regression guard)', () => {
    // 500 bars at up to 30px/bar comfortably overflows a 1000px pane — squarely the "long data"
    // branch, untouched by this fix.
    const vp = new Viewport(1000, 600, 2, 30, 5);
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
