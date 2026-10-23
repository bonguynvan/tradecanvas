import { describe, it, expect } from 'vitest';
import { PHI, FIBONACCI, phiStep } from '@tradecanvas/commons';

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
});
