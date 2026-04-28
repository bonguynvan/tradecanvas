import { describe, it, expect } from 'vitest';
import type { IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import { computeIndicatorPriceRange } from '../IndicatorPriceRange.js';

function output(values: IndicatorValue[]): IndicatorOutput {
  const map = new Map<number, IndicatorValue>();
  values.forEach((v, i) => map.set(i, v));
  return { values: map };
}

describe('computeIndicatorPriceRange', () => {
  it('returns the {0, 100} default for null output', () => {
    expect(computeIndicatorPriceRange(null, 0, 10)).toEqual({ min: 0, max: 100 });
  });

  it('returns the default when no values fall in [from, to]', () => {
    const out = output([{ value: 50 }, { value: 60 }, { value: 70 }]);
    expect(computeIndicatorPriceRange(out, 100, 200)).toEqual({ min: 0, max: 100 });
  });

  it('pads the visible min/max by 10% of the range', () => {
    const out = output([{ value: 10 }, { value: 30 }]);
    const range = computeIndicatorPriceRange(out, 0, 1);
    // span = 20, padding = 2 → [8, 32]
    expect(range.min).toBeCloseTo(8);
    expect(range.max).toBeCloseTo(32);
  });

  it('handles a flat series (vMin == vMax) without dividing by zero', () => {
    const out = output([{ value: 50 }, { value: 50 }, { value: 50 }]);
    const range = computeIndicatorPriceRange(out, 0, 2);
    // range collapses to 1, padding = 0.1 → [49.9, 50.1]
    expect(range.min).toBeCloseTo(49.9);
    expect(range.max).toBeCloseTo(50.1);
  });

  it('considers every numeric key on multi-value indicators (e.g. macd, signal, histogram)', () => {
    const out = output([
      { macd: -5, signal: -2, histogram: -3 },
      { macd: 10, signal: 8, histogram: 2 },
    ]);
    const range = computeIndicatorPriceRange(out, 0, 1);
    // overall min = -5, max = 10, span = 15, padding = 1.5 → [-6.5, 11.5]
    expect(range.min).toBeCloseTo(-6.5);
    expect(range.max).toBeCloseTo(11.5);
  });

  it('skips undefined and non-finite values', () => {
    const out = output([
      { value: NaN },
      { value: Infinity },
      { value: 25 },
      { other: undefined, value: 35 },
    ]);
    const range = computeIndicatorPriceRange(out, 0, 3);
    expect(range.min).toBeCloseTo(24);
    expect(range.max).toBeCloseTo(36);
  });

  it('only inspects values within the [from, to] window', () => {
    const out = output([
      { value: -100 }, // outside
      { value: 10 },   // visible
      { value: 30 },   // visible
      { value: 9999 }, // outside
    ]);
    const range = computeIndicatorPriceRange(out, 1, 2);
    expect(range.min).toBeCloseTo(8);
    expect(range.max).toBeCloseTo(32);
  });
});
