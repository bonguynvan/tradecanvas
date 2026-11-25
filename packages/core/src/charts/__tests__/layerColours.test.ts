import { describe, it, expect } from 'vitest';
import type { OHLCBar, ViewportState } from '@tradecanvas/commons';
import { DARK_THEME } from '@tradecanvas/commons';
import { DepthHeatmapRenderer } from '../DepthHeatmapRenderer.js';
import { MarketProfileRenderer } from '../MarketProfileRenderer.js';

const viewport = (): ViewportState => ({
  visibleRange: { from: 0, to: 20 },
  priceRange: { min: 90, max: 110 },
  barWidth: 10,
  barSpacing: 2,
  offset: 0,
  chartRect: { x: 0, y: 0, width: 240, height: 200 },
});

/** A context that keeps the colour each rectangle was filled with, and where each word was written. */
function recording() {
  const fills: string[] = [];
  const words: { text: string; y: number }[] = [];
  const state: Record<string, unknown> = { fillStyle: '', strokeStyle: '', globalAlpha: 1 };
  const ctx = new Proxy(state, {
    get(target, key: string) {
      if (key === 'fillRect') return () => { fills.push(String(target.fillStyle)); };
      if (key === 'fillText') return (text: string, _x: number, y: number) => { words.push({ text, y }); };
      if (key === 'measureText') return (text: string) => ({ width: text.length * 6 });
      return key in target ? target[key] : () => undefined;
    },
    set(target, key: string, value) {
      target[key] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, fills, words };
}

const bars: OHLCBar[] = Array.from({ length: 20 }, (_, i) => ({ time: i, open: 95 + (i % 5), high: 100 + (i % 5), low: 94 + (i % 5), close: 99 + (i % 5), volume: 1 }));
/** A theme whose candles are hidden: a chart that draws its own bars over the library's. */
const HIDDEN = { ...DARK_THEME, candleUp: 'rgba(0,0,0,0)', candleDown: 'rgba(0,0,0,0)' };

// A footprint chart hid the library's candles with a transparent theme, and the heatmap and the profile's value area went with them.
describe('DepthHeatmapRenderer: colours of its own', () => {
  const book = { bids: [{ price: 99.5, volume: 5 }], asks: [{ price: 100.5, volume: 3 }] };

  it('draws the bids and the asks in the colours it is given, whatever the candles’ are', () => {
    const heat = new DepthHeatmapRenderer();
    heat.setVisible(true);
    heat.setColors({ bidColor: '#1e88e5', askColor: '#fb8c00' });
    heat.push(5, book);
    const { ctx, fills } = recording();
    heat.render(ctx, viewport(), HIDDEN);
    expect(fills).toEqual(['#1e88e5', '#fb8c00']);
    expect(heat.getConfig()).toMatchObject({ bidColor: '#1e88e5', askColor: '#fb8c00' });
  });

  it('draws them in the candles’ colours with none given, and again once they are taken back', () => {
    const heat = new DepthHeatmapRenderer();
    heat.setVisible(true);
    heat.push(5, book);
    const first = recording();
    heat.render(first.ctx, viewport(), DARK_THEME);
    expect(first.fills).toEqual([DARK_THEME.candleUp, DARK_THEME.candleDown]);
    heat.setColors({ bidColor: '#1e88e5' });
    heat.setColors({ bidColor: null });
    const again = recording();
    heat.render(again.ctx, viewport(), DARK_THEME);
    expect(again.fills).toEqual([DARK_THEME.candleUp, DARK_THEME.candleDown]);
    expect(heat.getConfig()).toMatchObject({ bidColor: null, askColor: null });
  });
});

describe('MarketProfileRenderer: colours of its own', () => {
  it('draws the value area and the rows outside it in the colours it is given', () => {
    const profile = new MarketProfileRenderer();
    profile.setVisible(true);
    profile.setShowStats(false);
    profile.setColors({ valueAreaColor: '#7e57c2', color: '#90a4ae' });
    const { ctx, fills } = recording();
    profile.render(ctx, bars, viewport(), HIDDEN);
    expect(new Set(fills)).toEqual(new Set(['#7e57c2', '#90a4ae']));
    expect(profile.getConfig()).toMatchObject({ valueAreaColor: '#7e57c2', color: '#90a4ae' });
  });

  it('draws them as the theme has them with none given', () => {
    const profile = new MarketProfileRenderer();
    profile.setVisible(true);
    profile.setShowStats(false);
    const { ctx, fills } = recording();
    profile.render(ctx, bars, viewport(), DARK_THEME);
    expect(new Set(fills)).toEqual(new Set([DARK_THEME.candleUp, DARK_THEME.textSecondary]));
  });
});

// POC, VAH and VAL were written in the plot's top corner, where the legend's lines are.
describe('MarketProfileRenderer: its figures clear of the legend', () => {
  const firstWord = (clear: number | null) => {
    const profile = new MarketProfileRenderer();
    profile.setVisible(true);
    if (clear !== null) profile.setClearTop(clear);
    const { ctx, words } = recording();
    profile.render(ctx, bars, viewport(), DARK_THEME);
    return words.find((word) => word.text === 'POC')!.y;
  };

  it('writes them under what the chart says is taken at the top of the plot', () => {
    const top = firstWord(null);
    expect(firstWord(48)).toBeCloseTo(top + 48);
  });

  it('writes them in the corner with nothing there', () => {
    expect(firstWord(0)).toBe(firstWord(null));
  });
});
