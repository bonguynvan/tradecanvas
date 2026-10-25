import { describe, it, expect } from 'vitest';
import { PHI, type OHLCBar } from '@tradecanvas/commons';
import { Viewport } from '../Viewport.js';

const bars = (n: number): OHLCBar[] =>
  Array.from({ length: n }, (_, i) => ({ time: i * 60_000, open: 100, high: 101, low: 99, close: 100, volume: 1 }));
const slot = (vp: Viewport) => vp.getState().barWidth + vp.getState().barSpacing;
const share = (vp: Viewport) => vp.getState().barWidth / slot(vp);

describe('Viewport bar layouts', () => {
  it('opens classic at 10 px a slot, a 2 px gap', () => {
    const vp = new Viewport(1000, 600, 2, 30, 5);
    expect(vp.getBarLayout()).toBe('classic');
    expect(vp.getState()).toMatchObject({ barWidth: 8, barSpacing: 2 });
  });

  it('opens golden at φ⁴ px a slot, the body φ⁻¹ of it', () => {
    const vp = new Viewport(1000, 600, 2, 30, 5);
    vp.setBarLayout('golden');
    expect(vp.getBarLayout()).toBe('golden');
    expect(slot(vp)).toBeCloseTo(PHI ** 4, 9);
    expect(share(vp)).toBeCloseTo(1 / PHI, 9);
  });

  it('keeps the golden share through a zoom either way', () => {
    const vp = new Viewport(1000, 600, 2, 30, 5);
    vp.setBarLayout('golden');
    vp.updateData(bars(500), true);
    vp.zoom(0.3, 500);
    expect(share(vp)).toBeCloseTo(1 / PHI, 9);
    vp.zoom(-0.4, 500);
    expect(share(vp)).toBeCloseTo(1 / PHI, 9);
  });

  it('keeps the bodies between the narrowest and widest a bar may be', () => {
    const vp = new Viewport(1000, 600, 2, 30, 5);
    vp.setBarLayout('golden');
    vp.updateData(bars(200), true);
    for (let i = 0; i < 40; i++) vp.zoom(0.5, 500);
    expect(vp.getState().barWidth).toBeCloseTo(30, 9);
    for (let i = 0; i < 80; i++) vp.zoom(-0.5, 500);
    // 200 bars fit before the floor: the zoom out stops there, a 2 px body.
    expect(vp.getState().barWidth).toBeCloseTo(2, 9);
    expect(share(vp)).toBeCloseTo(1 / PHI, 9);
  });

  it('keeps a gap of a pixel or more down to the floor', () => {
    const vp = new Viewport(1000, 600, 2, 30, 5);
    vp.setBarLayout('golden');
    vp.updateData(bars(200), true);
    for (let i = 0; i < 80; i++) vp.zoom(-0.5, 500);
    expect(vp.getState().barSpacing).toBeGreaterThanOrEqual(1);
  });

  it.each([
    ['zoomed in past the classic widest', 0.5],
    ['zoomed out to the golden floor', -0.5],
  ])('stays at the newest bar when the layout changes %s', (_, delta) => {
    const vp = new Viewport(1000, 600, 2, 30, 5);
    vp.setBarLayout('golden');
    vp.updateData(bars(delta > 0 ? 300 : 100), true);
    for (let i = 0; i < 40; i++) vp.zoom(delta, 900);
    expect(vp.isAtEnd()).toBe(true);
    vp.setBarLayout('classic');
    expect(vp.isAtEnd()).toBe(true);
  });

  it('keeps the zoom when the layout changes over bars on screen, and only splits it again', () => {
    const vp = new Viewport(1000, 600, 2, 30, 5);
    vp.updateData(bars(300), true);
    vp.zoom(0.25, 500);
    const before = slot(vp);
    vp.setBarLayout('golden');
    expect(slot(vp)).toBeCloseTo(before, 9);
    expect(share(vp)).toBeCloseTo(1 / PHI, 9);
    vp.setBarLayout('classic');
    expect(slot(vp)).toBeCloseTo(before, 9);
    expect(vp.getState().barSpacing).toBe(2);
  });
});
