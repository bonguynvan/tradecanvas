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
