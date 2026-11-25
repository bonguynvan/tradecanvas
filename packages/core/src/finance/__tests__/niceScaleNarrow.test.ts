import { describe, it, expect } from 'vitest';
import { niceScale } from '../chartKit.js';
import { computeEquityLayout } from '../EquityCurveRenderer.js';

/**
 * A range far narrower than its values can be told apart in: 100,000 and
 * 100,000.00000000001 are two numbers, and a step between them is one that
 * a count of steps cannot be advanced by. The ticks' loop then never ended,
 * pushing until the array's length was no length ("Invalid array length"),
 * and the page with it.
 */
describe('niceScale over a range its values cannot be told apart in', () => {
  const narrow: [number, number][] = [
    [100_000, 100_000.00000000001],
    [100_000, 100_000 + 1e-10],
    [1e15, 1e15 + 1],
    [-100_000.00000000001, -100_000],
    [0.1 + 0.2, 0.3],
    [5e-324, 1e-323],
  ];

  it('ends, with a few ticks that are numbers, around the values', () => {
    for (const [lo, hi] of narrow) {
      const scale = niceScale(lo, hi, 5);
      expect(scale.ticks.length, `${lo}..${hi}`).toBeGreaterThanOrEqual(2);
      expect(scale.ticks.length, `${lo}..${hi}`).toBeLessThanOrEqual(12);
      expect(scale.ticks.every(Number.isFinite), `${lo}..${hi}`).toBe(true);
      expect(scale.max, `${lo}..${hi}`).toBeGreaterThan(scale.min);
      // The values are on the scale, not off one end of it.
      expect(scale.min, `${lo}..${hi}`).toBeLessThanOrEqual(lo);
      expect(scale.max, `${lo}..${hi}`).toBeGreaterThanOrEqual(hi);
    }
  });

  it('leaves a range that can be told apart as it was', () => {
    expect(niceScale(0, 100, 5).ticks).toEqual([0, 20, 40, 60, 80, 100]);
    expect(niceScale(99_950, 100_050, 5).ticks).toEqual([99_940, 99_960, 99_980, 100_000, 100_020, 100_040, 100_060]);
    expect(niceScale(100_000, 100_000.001, 5).ticks.length).toBeLessThanOrEqual(12);
  });
});

describe('an equity curve of one value', () => {
  const measure = (text: string) => text.length * 6;
  const points = (value: (i: number) => number) => Array.from({ length: 300 }, (_, i) => ({ time: Date.UTC(2026, 0, 1) + i * 86_400_000, value: value(i) }));

  it('is laid out with room above and below, a run with no trade beside a market that never moved', () => {
    // The benchmark rescaled to the curve's start: the same value but for the last bit of it.
    const layout = computeEquityLayout({ data: points(() => 100_000), benchmark: points(() => (100_000 / 3) * 3 + 1e-11) }, 600, 300, measure);
    expect(layout.scale.ticks.length).toBeLessThanOrEqual(12);
    expect(layout.scale.min).toBeLessThan(100_000);
    expect(layout.scale.max).toBeGreaterThan(100_000);
    // Both flat at the very same value, and a curve flat at nothing: as before.
    for (const value of [100_000, 0]) {
      const flat = computeEquityLayout({ data: points(() => value), benchmark: points(() => value) }, 600, 300, measure);
      expect(flat.scale.min).toBeLessThan(value || 0.0001);
      expect(flat.scale.max).toBeGreaterThan(value);
    }
  });
});
