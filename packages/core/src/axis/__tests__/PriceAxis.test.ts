import { describe, it, expect, vi } from 'vitest';
import type { ViewportState } from '@tradecanvas/commons';
import { DARK_THEME } from '@tradecanvas/commons';
import { PriceAxis } from '../PriceAxis.js';

const viewport: ViewportState = {
  visibleRange: { from: 0, to: 10 },
  priceRange: { min: 83_000, max: 85_000 },
  barWidth: 8,
  barSpacing: 2,
  offset: 0,
  chartRect: { x: 0, y: 0, width: 500, height: 400 },
};

function labels(axis: PriceAxis): string[] {
  const texts: string[] = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (_t, key) => (key === 'fillText' ? (t: string) => texts.push(t) : vi.fn()),
    set: () => true,
  }) as unknown as CanvasRenderingContext2D;
  axis.render(ctx, viewport, DARK_THEME);
  return texts;
}

describe('PriceAxis — last-price tag clearance', () => {
  it('hides the tick label the last-price tag would cover', () => {
    const axis = new PriceAxis();
    const all = labels(axis);
    expect(all).toContain('84,000.00');

    axis.setReservedPriceProvider(() => 83_954.43); // ~9 px from the 84,000 tick
    const withTag = labels(axis);
    expect(withTag).not.toContain('84,000.00');
    expect(withTag.length).toBe(all.length - 1);
  });

  it('keeps every label when no tag is shown', () => {
    const axis = new PriceAxis();
    axis.setReservedPriceProvider(() => null);
    expect(labels(axis)).toContain('84,000.00');
  });
});

describe('PriceAxis — other tags on the axis', () => {
  it('skips the tick labels any tag would cover, and only those', () => {
    const texts: string[] = [];
    const ctx = new Proxy({} as Record<string, unknown>, {
      get: (_t, key) => (key === 'fillText' ? (t: string) => texts.push(t) : vi.fn()),
      set: () => true,
    }) as unknown as CanvasRenderingContext2D;
    // 84,000 sits at y 200 on this 83,000..85,000 scale over 400 px.
    new PriceAxis().render(ctx, viewport, DARK_THEME, 'right', [205]);
    expect(texts).not.toContain('84,000.00');
    expect(texts).toContain('84,600.00');
  });
});

function labelsOn(axis: PriceAxis, priceRange: { min: number; max: number }): string[] {
  const texts: string[] = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (_t, key) => (key === 'fillText' ? (t: string) => texts.push(t) : vi.fn()),
    set: () => true,
  }) as unknown as CanvasRenderingContext2D;
  axis.render(ctx, { ...viewport, priceRange }, DARK_THEME);
  return texts;
}

describe('PriceAxis — the symbol’s precision and price step', () => {
  it('writes the labels in the symbol’s decimals', () => {
    const axis = new PriceAxis();
    axis.setPricePrecision(0);
    const texts = labelsOn(axis, { min: 21_200, max: 22_100 });
    expect(texts).toContain('22,000');
    expect(texts.every((t) => !t.includes('.'))).toBe(true);
    axis.setPricePrecision(null);
    expect(labelsOn(axis, { min: 21_200, max: 22_100 })).toContain('22,000.00');
  });

  it('puts the labels on the price step, never between two prices that can trade', () => {
    const axis = new PriceAxis();
    axis.setPricePrecision(0);
    axis.setPriceTick(10);
    // 8 ticks over 30 dong would be every 5: a price this stock never trades at.
    const texts = labelsOn(axis, { min: 21_700, max: 21_730 });
    expect(texts.length).toBeGreaterThan(0);
    for (const t of texts) expect(Number(t.replace(/,/g, '')) % 10).toBe(0);
  });

  it('still labels a range narrower than the price step (flat bars, a deep zoom)', () => {
    const axis = new PriceAxis();
    axis.setPricePrecision(0);
    axis.setPriceTick(10);
    const texts = labelsOn(axis, { min: 25_003, max: 25_003.16 });
    expect(texts.length).toBeGreaterThan(1);
    expect(new Set(texts).size).toBe(texts.length);
  });

  it('keeps a fraction’s steps with a fraction format', () => {
    const axis = new PriceAxis();
    axis.setPriceTick(0.01);
    const texts: string[] = [];
    const ctx = new Proxy({} as Record<string, unknown>, {
      get: (_t, key) => (key === 'fillText' ? (t: string) => texts.push(t) : vi.fn()),
      set: () => true,
    }) as unknown as CanvasRenderingContext2D;
    axis.render(ctx, { ...viewport, priceRange: { min: 100, max: 101 }, priceUnit: 1 / 32, formatPrice: (p) => String(p) }, DARK_THEME);
    expect(texts.length).toBeGreaterThan(0);
    for (const t of texts) expect(Number.isInteger(Number(t) * 32)).toBe(true);
  });

  it('keeps the top label a sum of steps would pass by a hair', () => {
    expect(labelsOn(new PriceAxis(), { min: 0.1, max: 0.3 })).toContain('0.300');
  });

  it('writes a price as the scale does, for measuring it', () => {
    const axis = new PriceAxis();
    axis.setPricePrecision(0);
    expect(axis.labelText(21_700, { ...viewport, priceRange: { min: 21_200, max: 22_100 } })).toBe('21,700');
  });

  it('writes each label once when the range is finer than the decimals', () => {
    const axis = new PriceAxis();
    axis.setPricePrecision(0);
    const texts = labelsOn(axis, { min: 100.1, max: 103.9 });
    expect(new Set(texts).size).toBe(texts.length);
    expect(texts).toEqual(['101', '102', '103']);
  });
});
