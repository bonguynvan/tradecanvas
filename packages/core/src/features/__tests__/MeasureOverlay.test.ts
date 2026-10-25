import { describe, it, expect } from 'vitest';
import { DARK_THEME, type ViewportState } from '@tradecanvas/commons';
import { MeasureOverlay } from '../MeasureOverlay.js';
import { priceToY } from '../../viewport/ScaleMapping.js';
import { recordingCtx, unitViewport } from '../../drawings/__tests__/fixtures.js';

const near100k: ViewportState = { ...unitViewport, priceRange: { min: 98_000, max: 102_000 } };

/** The measure's first line for a drag from 100,000 to `to`, on `viewport`. */
function deltaLine(to: number, viewport: ViewportState): string {
  const overlay = new MeasureOverlay();
  overlay.begin({ x: 105, y: priceToY(100_000, viewport) }, viewport, []);
  overlay.update({ x: 205, y: priceToY(to, viewport) }, viewport, []);
  const { ctx, texts } = recordingCtx();
  overlay.render(ctx, viewport, DARK_THEME);
  return texts[0];
}

describe('the measure’s price change', () => {
  it('is in the market’s decimals and the number locale, as the axis writes prices', () => {
    expect(deltaLine(100_055.3, { ...near100k, pricePrecision: 1 })).toBe('+55.3  (+0.06%)');
    expect(deltaLine(98_765.4, { ...near100k, pricePrecision: 1, numberLocale: 'de-DE' })).toBe('−1.234,6  (−1,23%)');
  });

  it('keeps the decimals it had without a market precision, grouped', () => {
    expect(deltaLine(100_055.3, near100k)).toBe('+55.3000  (+0.06%)');
    expect(deltaLine(101_234.5, near100k)).toBe('+1,234.50  (+1.23%)');
  });
});
