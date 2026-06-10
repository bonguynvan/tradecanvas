import { describe, it, expect } from 'vitest';
import { formatPriceScaleLabel } from '@tradecanvas/commons';

describe('formatPriceScaleLabel', () => {
  it('formats regular prices as plain numbers', () => {
    expect(formatPriceScaleLabel(64200, 'regular', undefined, 2, 'en-US')).toBe('64,200.00');
  });

  it('formats logarithmic the same as regular (geometry differs, labels do not)', () => {
    expect(formatPriceScaleLabel(120, 'logarithmic', 100, 2, 'en-US')).toBe('120.00');
  });

  it('formats percentage as signed change from baseline', () => {
    expect(formatPriceScaleLabel(110, 'percentage', 100, 2, 'en-US')).toBe('+10.00%');
    expect(formatPriceScaleLabel(90, 'percentage', 100, 2, 'en-US')).toBe('-10.00%');
    expect(formatPriceScaleLabel(100, 'percentage', 100, 2, 'en-US')).toBe('0.00%');
  });

  it('rebases indexedTo100 against the baseline', () => {
    expect(formatPriceScaleLabel(150, 'indexedTo100', 100, 2, 'en-US')).toBe('150.00');
    expect(formatPriceScaleLabel(200, 'indexedTo100', 50, 2, 'en-US')).toBe('400.00');
  });

  it('falls back to a plain price when a baseline is missing or zero', () => {
    expect(formatPriceScaleLabel(110, 'percentage', undefined, 2, 'en-US')).toBe('110.00');
    expect(formatPriceScaleLabel(110, 'indexedTo100', 0, 2, 'en-US')).toBe('110.00');
  });
});
