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

describe('CurrentPriceLine: a tag that reads', () => {
  it('fills its tag in the day’s colour deepened until its ink reads at 4.5:1, and leaves a look’s own colours alone', async () => {
    const { GRAPHITE_LIGHT_THEME, contrastRatio, resolveChartTheme } = await import('@tradecanvas/commons');
    for (const [price, close] of [[101, 100], [99, 100]]) {
      const line = new CurrentPriceLine();
      line.setPrice(price, close);
      line.renderTag(recordingCtx().ctx, viewport(90, 110), GRAPHITE_LIGHT_THEME);
      const tag = line.getTag()!;
      expect(contrastRatio(tag.color, tag.textColor)!, String(price)).toBeGreaterThanOrEqual(4.5);
    }
    const own = resolveChartTheme(GRAPHITE_LIGHT_THEME, 'candlestick', { 'lastPrice.labelBackground': '#0b8f6f' });
    const line = new CurrentPriceLine();
    line.setPrice(101, 100);
    line.renderTag(recordingCtx().ctx, viewport(90, 110), own);
    expect(line.getTag()!.color).toBe('#0b8f6f');
  });
});

describe('CurrentPriceLine: at the day’s limits', () => {
  const lines = [
    { price: 107, color: '#ff00ff', label: 'CE' },
    { price: 93, color: '#00ffff', label: 'FL' },
    { price: 100, color: '#ffd700', label: 'REF' },
  ];
  const tagAt = async (price: number, on: boolean, close = 100) => {
    const { resolveChartTheme } = await import('@tradecanvas/commons');
    const theme = resolveChartTheme(DARK_THEME, 'candlestick', on ? { 'lastPrice.limitColors': true } : {});
    const line = new CurrentPriceLine();
    line.setPrice(price, close);
    line.renderTag(recordingCtx().ctx, viewport(90, 110), theme, lines);
    return line.getTag()!.color.toLowerCase();
  };

  it('is the limit’s colour at the ceiling, at the floor and at the reference, where the style says so', async () => {
    expect(await tagAt(107, true)).toBe('#ff00ff');
    expect(await tagAt(93, true)).toBe('#00ffff');
    expect(await tagAt(100, true)).toBe('#ffd700');
    // Past a limit (a market that lets a price through) is at it still.
    expect(await tagAt(108, true)).toBe('#ff00ff');
    expect(await tagAt(92.5, true)).toBe('#00ffff');
  });

  it('draws its line in the limit’s colour too, and its tag over a look’s own tag colours', async () => {
    const { resolveChartTheme } = await import('@tradecanvas/commons');
    const theme = resolveChartTheme(DARK_THEME, 'candlestick', { 'lastPrice.limitColors': true, 'lastPrice.labelBackground': '#123456', 'lastPrice.labelTextColor': '#abcdef' });
    const strokes: string[] = [];
    const state: Record<string, unknown> = {};
    const ctx = new Proxy(state, {
      get: (target, key: string) => (key in target ? target[key] : key === 'stroke' ? () => strokes.push(String(target.strokeStyle)) : key === 'measureText' ? () => ({ width: 10 }) : () => {}),
      set: (target, key: string, value) => { target[key] = value; return true; },
    }) as unknown as CanvasRenderingContext2D;
    const line = new CurrentPriceLine();
    line.setPrice(107, 100);
    line.render(ctx, viewport(90, 112), theme, lines);
    expect(strokes.map((c) => c.toLowerCase())).toEqual(['#ff00ff']);
    expect(line.getTag()!.color.toLowerCase()).toBe('#ff00ff');
    expect(line.getTag()!.textColor).not.toBe('#abcdef');
    // Between the limits the look's own tag is back.
    line.setPrice(103, 100);
    line.render(ctx, viewport(90, 112), theme, lines);
    expect(line.getTag()!.color).toBe('#123456');
    expect(line.getTag()!.textColor).toBe('#abcdef');
  });

  it('is the day’s colour between them, and everywhere with the style off or no limits known', async () => {
    const up = DARK_THEME.candleUp.toLowerCase();
    const down = DARK_THEME.candleDown.toLowerCase();
    expect(await tagAt(103, true)).toBe(up);
    expect(await tagAt(97, true)).toBe(down);
    expect(await tagAt(107, false)).toBe(up);
    expect(await tagAt(93, false)).toBe(down);
    const { resolveChartTheme } = await import('@tradecanvas/commons');
    const line = new CurrentPriceLine();
    line.setPrice(107, 100);
    line.renderTag(recordingCtx().ctx, viewport(90, 110), resolveChartTheme(DARK_THEME, 'candlestick', { 'lastPrice.limitColors': true }));
    expect(line.getTag()!.color.toLowerCase()).toBe(up);
  });
});
