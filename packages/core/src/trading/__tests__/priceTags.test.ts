import { describe, it, expect } from 'vitest';
import { DARK_THEME, priceTagText, type ViewportState } from '@tradecanvas/commons';
import { OrderRenderer } from '../OrderRenderer.js';
import { PositionRenderer } from '../PositionRenderer.js';
import { buildPositionLabelContext, formatPositionLabel } from '../positionFormat.js';
import { recordingCtx, unitViewport } from '../../drawings/__tests__/fixtures.js';

const near72k: ViewportState = { ...unitViewport, priceRange: { min: 71_000, max: 73_000 } };

describe('priceTagText', () => {
  it('writes a price as the axis does: grouped in the chart’s number locale', () => {
    expect(priceTagText(72_202.13, near72k, 2)).toBe('72,202.13');
    expect(priceTagText(72_202.13, { ...near72k, numberLocale: 'de-DE' }, 2)).toBe('72.202,13');
  });

  it('takes the chart’s own price format when it has one', () => {
    expect(priceTagText(72_202.13, { ...near72k, formatPrice: (p) => `$${Math.round(p)}` }, 2)).toBe('$72202');
  });

  it('fits the decimals to the range on view when none are given', () => {
    const tiny: ViewportState = { ...unitViewport, priceRange: { min: 0.0000041, max: 0.0000046 } };
    expect(priceTagText(0.0000043491, tiny)).toBe('0.00000435');
  });
});

describe('the trading tags', () => {
  it('put the price alone on the axis, grouped, and the quantity on the line', () => {
    const { ctx, texts } = recordingCtx();
    const order = { id: 'o1', side: 'buy' as const, type: 'limit' as const, price: 72_202.13, quantity: 3 };
    const renderer = new OrderRenderer();
    renderer.render(ctx, [order], near72k, DARK_THEME, {}, null);
    renderer.renderAxisBadges(ctx, [order], near72k, DARK_THEME, {}, null);
    expect(texts).toContain('LIMIT 3');
    expect(texts).toContain('72,202.13');
    expect(texts.some((t) => t.includes(' x '))).toBe(false);
  });

  it('keep the quantity beside an order’s kind label (a paper broker’s STOP)', () => {
    const { ctx, texts } = recordingCtx();
    const order = { id: 'o2', side: 'sell' as const, type: 'stop' as const, label: 'STOP' as const, price: 71_900, quantity: 2 };
    new OrderRenderer().render(ctx, [order], near72k, DARK_THEME, {}, null);
    expect(texts).toContain('STOP 2');
  });

  it('write a position’s entry on the axis as the axis does', () => {
    const { ctx, texts } = recordingCtx();
    new PositionRenderer().renderAxisBadges(ctx, [{ id: 'p', side: 'buy', entryPrice: 71_558.11, quantity: 1 }], near72k, DARK_THEME, {});
    expect(texts).toEqual(['71,558.11']);
  });

  it('group the P&L in the number locale', () => {
    const ctx = buildPositionLabelContext({ id: 'p', side: 'buy', entryPrice: 100, quantity: 1000 }, 101.2345, 2, undefined, 'en-US');
    expect(formatPositionLabel('{pnlSign}{pnl}', ctx)).toBe('+1,234.50');
  });
});
