import { describe, it, expect } from 'vitest';
import type { ViewportState } from '@tradecanvas/commons';
import { FibRetracementTool } from '../tools/FibRetracement.js';
import { HorizontalLineTool } from '../tools/HorizontalLine.js';
import { drawing, recordingCtx, unitViewport } from './fixtures.js';

/** A view around 100,000, where the market's one decimal differs from the size's two. */
const near100k: ViewportState = { ...unitViewport, priceRange: { min: 98_000, max: 101_000 } };
const FIB_ANCHORS = [{ time: 0, price: 98_753.9 }, { time: 50, price: 100_327.1 }];

const fibTexts = (viewport: ViewportState) => {
  const { ctx, texts } = recordingCtx();
  new FibRetracementTool().render(ctx, drawing('fibRetracement', FIB_ANCHORS), viewport, false);
  return texts;
};

describe('drawing price labels', () => {
  it('write a fib level’s price in the market’s decimals, grouped as the axis does', () => {
    const texts = fibTexts({ ...near100k, pricePrecision: 1 });
    expect(texts).toContain('23.6% (99,125.2)');
    expect(texts).toContain('100.0% (100,327.1)');
  });

  it('group a fib level’s price without a market precision, at the decimals they had', () => {
    expect(fibTexts(near100k)).toContain('23.6% (99,125.18)');
  });

  it('write a horizontal line’s price in the number locale', () => {
    const { ctx, texts } = recordingCtx();
    const line = drawing('horizontalLine', [{ time: 0, price: 98_977.3 }]);
    new HorizontalLineTool().render(ctx, line, { ...near100k, pricePrecision: 1, numberLocale: 'de-DE' }, false);
    expect(texts).toContain('98.977,3');
  });
});
