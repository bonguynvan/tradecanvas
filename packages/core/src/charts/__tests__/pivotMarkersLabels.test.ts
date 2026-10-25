import { describe, it, expect } from 'vitest';
import { DARK_THEME, type OHLCBar, type ViewportState } from '@tradecanvas/commons';
import { PivotMarkersRenderer } from '../PivotMarkersRenderer.js';
import { recordingCtx, unitViewport } from '../../drawings/__tests__/fixtures.js';

/** Three bars whose middle one is a pivot high at `high`, the others a step under it. */
function peak(high: number, step: number): OHLCBar[] {
  return [high - step, high, high - step].map((h, i) => ({ time: i, open: h, high: h, low: h - step, close: h, volume: 1 }));
}

function labels(data: OHLCBar[], viewport: ViewportState): string[] {
  const renderer = new PivotMarkersRenderer();
  renderer.setVisible(true);
  renderer.setStrength(1, 1);
  renderer.setShowLabels(true);
  const { ctx, texts } = recordingCtx();
  renderer.render(ctx, data, viewport, DARK_THEME);
  return texts;
}

const near100k: ViewportState = { ...unitViewport, priceRange: { min: 99_000, max: 101_000 } };

describe('pivot labels', () => {
  it('write the price in the market’s decimals, grouped in the number locale', () => {
    expect(labels(peak(99_860.5, 20), { ...near100k, pricePrecision: 1 })).toEqual(['99,860.5']);
    expect(labels(peak(99_860.5, 20), { ...near100k, pricePrecision: 1, numberLocale: 'de-DE' })).toEqual(['99.860,5']);
  });

  it('keep the decimals they had without a market precision, grouped', () => {
    expect(labels(peak(99_860.5, 20), near100k)).toEqual(['99,860.50']);
    // Below 1: four significant digits, as before.
    expect(labels(peak(0.04821, 0.0001), { ...unitViewport, priceRange: { min: 0.047, max: 0.049 } })).toEqual(['0.04821']);
  });
});
