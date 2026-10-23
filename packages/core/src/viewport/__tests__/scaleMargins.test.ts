import { describe, it, expect } from 'vitest';
import { PHI, fitPriceRange, type OHLCBar } from '@tradecanvas/commons';
import { Viewport } from '../Viewport.js';
import { priceToY } from '../ScaleMapping.js';
import { VolumeRenderer } from '../../charts/VolumeRenderer.js';

/** Bars swinging between 100 and 200. */
function bars(n: number): OHLCBar[] {
  return Array.from({ length: n }, (_, i) => {
    const mid = 150 + 50 * Math.sin(i / 3);
    return { time: i * 60_000, open: mid, high: Math.min(200, mid + 5), low: Math.max(100, mid - 5), close: mid, volume: 10 };
  });
}

describe('fitPriceRange', () => {
  it('puts the prices between margins measured on the scale’s height', () => {
    const { min, max } = fitPriceRange(100, 200, { top: 0.1, bottom: 0.2 });
    const span = max - min;
    expect((max - 200) / span).toBeCloseTo(0.1, 9);
    expect((100 - min) / span).toBeCloseTo(0.2, 9);
  });

  it('measures the margins in log space on a log scale', () => {
    const { min, max } = fitPriceRange(100, 10_000, { top: 0.1, bottom: 0.2 }, true);
    const span = Math.log(max / min);
    expect(Math.log(max / 10_000) / span).toBeCloseTo(0.1, 9);
    expect(Math.log(100 / min) / span).toBeCloseTo(0.2, 9);
    expect(min).toBeGreaterThan(0);
  });

  it('gives a flat price room on both sides', () => {
    const { min, max } = fitPriceRange(50, 50, { top: 0.1, bottom: 0.1 });
    expect(min).toBeLessThan(50);
    expect(max).toBeGreaterThan(50);
  });
});

describe('the scale’s margins', () => {
  it('keeps φ⁻⁵ of the height above the highest high and below the lowest low by default', () => {
    const vp = new Viewport(1000, 600, 2, 30, 5);
    vp.updateData(bars(60), true);
    const state = vp.getState();
    const { y, height } = state.chartRect;
    const visible = bars(60).slice(state.visibleRange.from, state.visibleRange.to + 1);
    const high = Math.max(...visible.map((b) => b.high));
    const low = Math.min(...visible.map((b) => b.low));
    expect(priceToY(high, state) - y).toBeCloseTo(height * PHI ** -5, 6);
    expect(y + height - priceToY(low, state)).toBeCloseTo(height * PHI ** -5, 6);
  });

  it('takes margins of its own and fits prices into them', () => {
    const vp = new Viewport(1000, 600, 2, 30, 5);
    vp.setScaleMargins({ top: 0.05, bottom: 0.3 });
    expect(vp.getScaleMargins()).toEqual({ top: 0.05, bottom: 0.3 });
    vp.fitToPrices(100, 200);
    const state = vp.getState();
    const { y, height } = state.chartRect;
    expect(priceToY(200, state) - y).toBeCloseTo(height * 0.05, 6);
    expect(y + height - priceToY(100, state)).toBeCloseTo(height * 0.3, 6);
  });

  it('refuses margins that leave no room for the prices', () => {
    const vp = new Viewport(1000, 600, 2, 30, 5);
    const before = vp.getScaleMargins();
    vp.setScaleMargins({ top: 0.6, bottom: 0.5 });
    vp.setScaleMargins({ top: -1, bottom: 0.1 });
    vp.setScaleMargins({ top: Number.NaN, bottom: 0.1 });
    expect(vp.getScaleMargins()).toEqual(before);
  });
});

describe('the volume band', () => {
  it('is a half step of φ under φ⁻⁴ of the plot’s height', () => {
    expect(new VolumeRenderer().getHeightRatio()).toBeCloseTo(PHI ** -4.5, 9);
  });
});
