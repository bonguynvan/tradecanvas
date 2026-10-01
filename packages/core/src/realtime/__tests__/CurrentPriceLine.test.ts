import { describe, it, expect, vi } from 'vitest';
import type { ViewportState } from '@tradecanvas/commons';
import { DARK_THEME, PRICE_AXIS_WIDTH } from '@tradecanvas/commons';
import { CurrentPriceLine } from '../CurrentPriceLine.js';

function viewport(min: number, max: number, priceAxisWidth?: number): ViewportState {
  return {
    visibleRange: { from: 0, to: 10 },
    priceRange: { min, max },
    barWidth: 6,
    barSpacing: 2,
    offset: 0,
    chartRect: { x: 0, y: 0, width: 200, height: 100 },
    priceAxisWidth,
  };
}

function recordingCtx(charWidth = 7) {
  const texts: string[] = [];
  const rects: number[][] = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get(_t, key: string) {
      if (key === 'measureText') return (t: string) => ({ width: t.length * charWidth });
      if (key === 'fillText') return (t: string) => texts.push(t);
      if (key === 'fillRect') return (...a: number[]) => rects.push(a);
      return vi.fn();
    },
    set: () => true,
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, texts, rects };
}

describe('CurrentPriceLine', () => {
  it('shows a sub-cent price at the axis precision instead of 0.00', () => {
    const line = new CurrentPriceLine();
    line.setPrice(0.000004349);
    const { ctx, texts } = recordingCtx();
    line.render(ctx, viewport(0.0000042, 0.0000045), DARK_THEME);
    expect(texts).toEqual(['0.00000435']); // the axis's 8 decimals
  });

  it('uses an explicit precision and the number locale', () => {
    const line = new CurrentPriceLine();
    line.setLocale('vi-VN');
    line.setPricePrecision(9);
    line.setPrice(0.000004349);
    const { ctx, texts } = recordingCtx();
    line.render(ctx, viewport(0.0000042, 0.0000045), DARK_THEME);
    expect(texts).toEqual(['0,000004349']);
  });

  it('sizes the tag to the actual axis width, not the default', () => {
    const line = new CurrentPriceLine();
    line.setPrice(0.000004349);
    const wide = recordingCtx();
    line.render(wide.ctx, viewport(0.0000042, 0.0000045, 120), DARK_THEME);
    expect(wide.rects[0][2]).toBe(10 * 7 + 12); // "0.00000435" fits whole
    const narrow = recordingCtx();
    line.render(narrow.ctx, viewport(0.0000042, 0.0000045), DARK_THEME);
    expect(narrow.rects[0][2]).toBe(PRICE_AXIS_WIDTH - 2);
  });
});
