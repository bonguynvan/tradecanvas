import { describe, it, expect } from 'vitest';
import { PHI, type DataSeries, type ViewportState } from '@tradecanvas/commons';
import { PriceFit, type FitTarget, type FitSources } from '../PriceFit.js';

const bar = (t: number, low: number, high: number, volume = 0) => ({ time: t, open: low, high, low, close: high, volume });

/** A viewport that records what it was asked to do. */
function target(invert = false) {
  const calls: { margins?: { top: number; bottom: number }; prices?: [number, number] } = {};
  const t: FitTarget = {
    isInvertScale: () => invert,
    setScaleMargins: (m) => { calls.margins = m; },
    fitToPrices: (min, max) => { calls.prices = [min, max]; },
  };
  return { t, calls };
}

const state = (from: number, to: number, width = 600, offset = 0, barWidth = 6, barSpacing = 2) =>
  ({ visibleRange: { from, to }, chartRect: { x: 0, y: 0, width, height: 300 }, offset, barWidth, barSpacing }) as unknown as ViewportState;

const none: FitSources = { overlayRange: () => null, compareRange: () => null, volumeRatio: () => null };

describe('PriceFit: what the scale is fitted to', () => {
  it('fits the bars on view, not the ones off screen', () => {
    const data: DataSeries = [bar(1, 1, 2), bar(2, 10, 20), bar(3, 11, 21)];
    const { t, calls } = target();
    new PriceFit(true).fit(t, data, state(1, 2), none);
    expect(calls.prices).toEqual([10, 21]);
  });

  it('takes in the overlay indicators and the compare lines', () => {
    const data: DataSeries = [bar(1, 10, 20)];
    const { t, calls } = target();
    new PriceFit(true).fit(t, data, state(0, 0), {
      overlayRange: () => ({ min: 5, max: 15 }),
      compareRange: () => ({ min: 12, max: 30 }),
      volumeRatio: () => null,
    });
    expect(calls.prices).toEqual([5, 30]);
  });

  it('leaves the bottom band to the volume, and a gap above it, the top on an upside-down scale', () => {
    const data: DataSeries = [bar(1, 10, 20, 100)];
    const up = target();
    const sources = { ...none, volumeRatio: () => 0.3 };
    new PriceFit(true).fit(up.t, data, state(0, 0), sources);
    expect(up.calls.margins!.bottom).toBeCloseTo(0.3 + PHI ** -6);
    expect(up.calls.margins!.top).toBeCloseTo(PHI ** -4.5);
    const down = target(true);
    new PriceFit(true).fit(down.t, data, state(0, 0), sources);
    expect(down.calls.margins!.top).toBeCloseTo(0.3 + PHI ** -6);
  });

  it('fits in the margins it is given: a compact chart’s φ⁻⁵, and φ⁻⁷ over the volume', () => {
    const data: DataSeries = [bar(1, 10, 20, 100)];
    const fit = new PriceFit(true);
    fit.setSpacing({ priceMargin: PHI ** -5, volumeGap: PHI ** -7 });
    const plain = target();
    fit.fit(plain.t, data, state(0, 0), none);
    expect(plain.calls.margins).toEqual({ top: PHI ** -5, bottom: PHI ** -5 });
    const withVolume = target();
    fit.fit(withVolume.t, data, state(0, 0), { ...none, volumeRatio: () => 0.3 });
    expect(withVolume.calls.margins!.bottom).toBeCloseTo(0.3 + PHI ** -7);
  });

  it('does nothing on an empty series', () => {
    const { t, calls } = target();
    new PriceFit(true).fit(t, [], state(0, 0), none);
    expect(calls).toEqual({});
  });
});

describe('PriceFit: when the scale is fitted', () => {
  const some: DataSeries = [bar(1, 10, 20), bar(2, 11, 21)];

  it('fits with auto-scale on', () => {
    expect(new PriceFit(true).shouldFit()).toBe(true);
  });

  it('with auto-scale off, fits a new series once, then holds it', () => {
    const fit = new PriceFit(false);
    fit.newSeries(false);
    expect(fit.shouldFit()).toBe(true);
    fit.settle(state(0, 1), some.length);
    expect(fit.shouldFit()).toBe(false);
  });

  it('keeps fitting bars that come one by one into an empty chart until they fill it', () => {
    const fit = new PriceFit(false);
    fit.newSeries(true);
    // Two bars of 8 px on a 600 px plot: all on view, so still arriving.
    fit.settle(state(0, 1), 2);
    expect(fit.shouldFit()).toBe(true);
    // A hundred bars of 8 px overflow it.
    fit.settle(state(25, 99), 100);
    expect(fit.shouldFit()).toBe(false);
  });

  it('waits for a plot with a size: a hidden chart fits once it is shown', () => {
    const fit = new PriceFit(false);
    fit.newSeries(false);
    fit.settle(state(0, 1, 0), some.length);
    expect(fit.shouldFit()).toBe(true);
  });

  it('a drag of the price axis holds the range, until the next series', () => {
    const fit = new PriceFit(true);
    fit.hold();
    expect(fit.isAuto()).toBe(false);
    expect(fit.shouldFit()).toBe(false);
    fit.newSeries(false);
    expect(fit.isAuto()).toBe(true);
  });

  it('setAuto(false) is a preference a new series keeps', () => {
    const fit = new PriceFit(true);
    fit.setAuto(false, true);
    fit.newSeries(false);
    expect(fit.isAuto()).toBe(false);
    // Still fitted once.
    expect(fit.shouldFit()).toBe(true);
  });

  it('setAuto(false) while bars arrive holds what is on screen now', () => {
    const fit = new PriceFit(true);
    fit.newSeries(true);
    fit.setAuto(false, true);
    fit.settle(state(0, 1), 2);
    expect(fit.shouldFit()).toBe(false);
  });

  it('resume() turns auto-scale back on without changing the preference', () => {
    const fit = new PriceFit(false);
    fit.resume();
    expect(fit.isAuto()).toBe(true);
    fit.newSeries(false);
    expect(fit.isAuto()).toBe(false);
  });
});
