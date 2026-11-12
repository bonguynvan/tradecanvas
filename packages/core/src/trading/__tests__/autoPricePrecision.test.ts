import { describe, it, expect } from 'vitest';
import { autoPricePrecision } from '@tradecanvas/commons';

describe('autoPricePrecision under 1', () => {
  it('shows four figures of the largest price on view, however coarse the step', () => {
    // A wide range on a sub-cent coin: the step alone needs 8 decimals, three figures of the price.
    expect(autoPricePrecision(0.0000020, 0.0000030)).toBe(9);
    expect(autoPricePrecision(0.00000284, 0.00000285)).toBeGreaterThanOrEqual(9);
    // A price of cents, and one just under 1.
    expect(autoPricePrecision(0.04, 0.06)).toBe(5);
    expect(autoPricePrecision(0.4, 0.6)).toBe(4);
  });

  it('keeps the step’s decimals where they already show more, and every range from 1 up as it was', () => {
    expect(autoPricePrecision(0.5, 0.5001)).toBe(6);
    expect(autoPricePrecision(60000, 70000)).toBe(2);
    expect(autoPricePrecision(1.05, 1.07)).toBe(3);
    expect(autoPricePrecision(0.9, 1.1)).toBe(2);
  });

  it('reads a range below nothing by its size, and a flat or broken one as two decimals', () => {
    expect(autoPricePrecision(-0.0000030, -0.0000020)).toBe(9);
    expect(autoPricePrecision(5, 5)).toBe(2);
    expect(autoPricePrecision(Number.NaN, 1)).toBe(2);
  });
});
