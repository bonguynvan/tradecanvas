import { describe, it, expect } from 'vitest';
import { MIN_PRICE_LABEL_GAP_PX, PRICE_LABEL_SPACING_PX, roundStep } from '../PriceAxis.js';

/** Pixels between two labels of `step` on a scale showing `range` in `height` px. */
const gap = (step: number, range: number, height: number) => (step / range) * height;

describe('the price scale\u2019s step', () => {
  it('is the largest round step whose labels sit no farther apart than the spacing aimed for', () => {
    // 2,900 of price in 640px: 200 apart is 44px. It was 500, 110px apart: six labels on a laptop.
    expect(roundStep(66000, 68900, 640)).toBe(200);
    expect(roundStep(0, 100, 560)).toBe(10);
    expect(roundStep(0.00000280, 0.00000300, 640)).toBeCloseTo(0.00000001, 12);
  });

  it('keeps its labels between the least gap and the spacing aimed for, whatever the range', () => {
    for (const height of [120, 300, 640, 1000, 1400]) {
      for (const range of [0.0003, 0.7, 3, 19, 64, 290, 2900, 7100, 48000]) {
        const step = roundStep(1000, 1000 + range, height);
        const px = gap(step, range, height);
        expect(px, `${range} in ${height}px`).toBeGreaterThanOrEqual(MIN_PRICE_LABEL_GAP_PX - 1e-6);
        // The next round step down would be too close, or this one is within the spacing.
        expect(px, `${range} in ${height}px`).toBeLessThanOrEqual(PRICE_LABEL_SPACING_PX * 2.5);
      }
    }
  });

  it('is a round number: 1, 2 or 5 times a power of ten', () => {
    for (const range of [0.7, 3, 19, 64, 290, 2900]) {
      const step = roundStep(0, range, 640);
      const lead = step / 10 ** Math.floor(Math.log10(step) + 1e-9);
      expect([1, 2, 5]).toContain(Math.round(lead));
    }
  });

  it('keeps to its range in a pane shorter than the spacing: a step past it left the scale no label', () => {
    // Under 30px no two labels fit, whatever the step.
    for (const height of [40, 55]) {
      const step = roundStep(0, 4.9, height);
      expect(step, `${height}px`).toBeLessThanOrEqual(5);
      expect(roundStep(0, 100, height), `${height}px`).toBeLessThanOrEqual(100);
    }
    expect(roundStep(0, 100, 80)).toBe(50);
  });

  it('gives nothing to walk for a flat range or a pane with no height', () => {
    expect(roundStep(5, 5, 600) > 0).toBe(false);
    expect(Number.isFinite(roundStep(0, 100, 0))).toBe(true);
  });
});
