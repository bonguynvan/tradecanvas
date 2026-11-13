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
    expect(texts).toEqual(['0.000004349']); // four figures of the price, where the step's 8 decimals left three
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

  it('is as wide as the axis, as every tag on it is, and has no arrow into the plot', () => {
    const line = new CurrentPriceLine();
    line.setPrice(100);
    const { ctx, rects } = recordingCtx();
    const view = viewport(0, 200, 96);
    line.render(ctx, view, DARK_THEME);
    // One box: a short price does not make a short tag beside an order's full one.
    expect(rects).toHaveLength(1);
    expect(rects[0][2]).toBe(96 - 2);
    expect(rects[0][0]).toBe(view.chartRect.x + view.chartRect.width + 1);
  });

  it('sizes the tag to the actual axis width, not the default', () => {
    const line = new CurrentPriceLine();
    line.setPrice(0.000004349);
    const wide = recordingCtx();
    line.render(wide.ctx, viewport(0.0000042, 0.0000045, 120), DARK_THEME);
    expect(wide.rects[0][2]).toBe(120 - 2); // "0.000004349" fits whole
    const narrow = recordingCtx();
    line.render(narrow.ctx, viewport(0.0000042, 0.0000045), DARK_THEME);
    expect(narrow.rects[0][2]).toBe(PRICE_AXIS_WIDTH - 2);
  });

  describe('the colour of the tag', () => {
    function colour(line: CurrentPriceLine): string | undefined {
      line.render(recordingCtx().ctx, viewport(0, 200), DARK_THEME);
      return line.getTag()?.color;
    }

    it('is measured from the close given, else from the price shown before', () => {
      const line = new CurrentPriceLine();
      line.setPrice(96, 100);
      expect(colour(line)).toBe(DARK_THEME.candleDown);
      line.setPrice(97);
      expect(colour(line)).toBe(DARK_THEME.candleUp);
    });

    it('stays when the same price comes again with no close to measure from', () => {
      const line = new CurrentPriceLine();
      line.setPrice(96, 100);
      line.setPrice(96);
      expect(colour(line)).toBe(DARK_THEME.candleDown);
    });
  });
});
