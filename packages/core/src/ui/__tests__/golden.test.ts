import { describe, it, expect } from 'vitest';
import { CHART_SPACING, DEFAULT_CHART_OPTIONS, PHI, FIBONACCI, evenPx, phiStep } from '@tradecanvas/commons';

describe('the golden ratio', () => {
  it('is φ', () => {
    expect(PHI).toBeCloseTo(1.6180339887, 9);
    expect(PHI * PHI).toBeCloseTo(PHI + 1, 12);
  });

  it('counts the Fibonacci numbers, each the sum of the two before', () => {
    expect(FIBONACCI.slice(0, 8)).toEqual([1, 2, 3, 5, 8, 13, 21, 34]);
    for (let i = 2; i < FIBONACCI.length; i++) expect(FIBONACCI[i]).toBe(FIBONACCI[i - 1] + FIBONACCI[i - 2]);
  });

  it('climbs a scale by fractions of φ, in whole pixels', () => {
    // Half steps from an icon: its small button, its button, its bar.
    expect([0, 1, 2, 3, 4].map((n) => phiStep(16, n, 2))).toEqual([16, 20, 26, 33, 42]);
    // Third steps from body text: every third size is φ larger.
    expect([-1, 0, 1, 2, 3].map((n) => phiStep(13, n, 3))).toEqual([11, 13, 15, 18, 21]);
    expect(phiStep(26, 1)).toBe(42);
    expect(phiStep(42, -1)).toBe(26);
  });

  it('rounds a size to the even number of pixels nearest it, a tie up, never under 2', () => {
    expect([32.9, 33, 41.9, 53.3, 59, 20, 21].map(evenPx)).toEqual([32, 34, 42, 54, 60, 20, 22]);
    expect(evenPx(0.4)).toBe(2);
    // An even size around an even one leaves whole pixels either side.
    for (const [outer, inner] of [[34, 20], [42, 34], [36, 26]]) expect(((evenPx(outer) - evenPx(inner)) / 2) % 1).toBe(0);
  });
});

describe('the room a chart leaves around its bars', () => {
  it('is compact as the chart was before 2.0: classic bars, 5 bars of room, φ⁻⁵ above and below, φ⁻⁷ over the volume', () => {
    const compact = CHART_SPACING.compact;
    expect(compact).toMatchObject({ barLayout: 'classic', rightMargin: 5, legendInset: 8, legendTop: 6, legendLineGap: 3 });
    expect(compact.priceMargin).toBeCloseTo(PHI ** -5, 12);
    expect(compact.volumeGap).toBeCloseTo(PHI ** -7, 12);
  });

  it('is comfortable a step up each ladder: golden bars, 8 bars of room, φ⁻⁴·⁵ above and below, φ⁻⁶ over the volume', () => {
    const comfortable = CHART_SPACING.comfortable;
    expect(comfortable).toMatchObject({ barLayout: 'golden', rightMargin: 8, legendInset: 12, legendTop: 8, legendLineGap: 4 });
    expect(comfortable.priceMargin).toBeCloseTo(PHI ** -4.5, 12);
    expect(comfortable.volumeGap).toBeCloseTo(PHI ** -6, 12);
    // The room past the newest bar is the next Fibonacci number.
    expect(FIBONACCI).toContain(comfortable.rightMargin);
    expect(DEFAULT_CHART_OPTIONS.rightMargin).toBe(comfortable.rightMargin);
  });

  it('never lets the volume band and its gap reach the candles: together they are the bottom margin', () => {
    const band = PHI ** -4.5;
    for (const spacing of Object.values(CHART_SPACING)) expect(band + spacing.volumeGap).toBeLessThan(0.2);
  });
});
