import { describe, it, expect } from 'vitest';
import { PRICE_AXIS_WIDTH, autoPricePrecision } from '@tradecanvas/commons';
import { requiredPriceAxisWidth, nextPriceAxisWidth, AXIS_SHRINK_SLACK } from '../priceAxisWidth.js';

/** 6px per character, regardless of font. */
const measure = (text: string) => text.length * 6;
const base = { lastPrice: null, tagPrecision: null, locale: 'en-US', fontFamily: 'sans-serif', fontSizeSmall: 11, measure };

describe('autoPricePrecision', () => {
  it('matches the axis: 2 for normal assets, more for sub-dollar and sub-cent ones', () => {
    expect(autoPricePrecision(82_000, 86_000)).toBe(2);
    expect(autoPricePrecision(0.335, 0.342)).toBe(4);
    expect(autoPricePrecision(0.0000042, 0.0000045)).toBe(8);
    expect(autoPricePrecision(5, 5)).toBe(2); // degenerate range
  });
});

describe('requiredPriceAxisWidth', () => {
  it('keeps the default width when labels are short', () => {
    expect(requiredPriceAxisWidth({ ...base, min: 10, max: 20 })).toBe(PRICE_AXIS_WIDTH);
  });

  it('widens for sub-cent labels so the price tag is not clipped', () => {
    const w = requiredPriceAxisWidth({ ...base, min: 0.0000042, max: 0.0000045, lastPrice: 0.000004349 });
    // "0.00000435" = 10 chars → 60px + 22px crosshair-pill chrome = 82 → 84.
    expect(w).toBe(84);
  });

  it('accounts for a longer explicit market precision', () => {
    const auto = requiredPriceAxisWidth({ ...base, min: 0.0000042, max: 0.0000045 });
    const fixed = requiredPriceAxisWidth({ ...base, min: 0.0000042, max: 0.0000045, tagPrecision: 12 });
    expect(fixed).toBeGreaterThan(auto);
  });
});

describe('nextPriceAxisWidth', () => {
  it('grows immediately', () => {
    expect(nextPriceAxisWidth(70, 88)).toBe(88);
  });

  it('only shrinks once enough room is spare, so panning does not twitch the axis', () => {
    expect(nextPriceAxisWidth(88, 88 - AXIS_SHRINK_SLACK + 4)).toBe(88);
    expect(nextPriceAxisWidth(88, 88 - AXIS_SHRINK_SLACK)).toBe(88 - AXIS_SHRINK_SLACK);
  });
});
