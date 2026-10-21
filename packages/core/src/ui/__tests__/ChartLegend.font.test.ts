import { describe, it, expect } from 'vitest';
import type { ViewportState, OHLCBar } from '@tradecanvas/commons';
import { DARK_THEME } from '@tradecanvas/commons';
import { ChartLegend } from '../ChartLegend.js';

const viewport: ViewportState = {
  visibleRange: { from: 0, to: 10 },
  priceRange: { min: 90, max: 120 },
  barWidth: 6,
  barSpacing: 2,
  offset: 0,
  chartRect: { x: 0, y: 0, width: 400, height: 200 },
};

const bar = (close: number): OHLCBar => ({ time: 0, open: 100, high: 111, low: 99, close, volume: 1500 });

/** A context whose digits have different widths, as in a proportional font: '1' is narrow. */
function recordingCtx() {
  const fonts: string[] = [];
  const texts: { text: string; x: number; font: string }[] = [];
  let font = '';
  const ctx = {
    set font(v: string) { font = v; fonts.push(v); },
    get font() { return font; },
    set fillStyle(_v: string) {},
    set textAlign(_v: string) {},
    set textBaseline(_v: string) {},
    fillText: (text: string, x: number) => texts.push({ text, x, font }),
    measureText: (text: string) => ({ width: [...text].reduce((w, c) => w + (c === '1' ? 4 : 8), 0) }),
  } as unknown as CanvasRenderingContext2D;
  return { ctx, fonts, texts };
}

describe('ChartLegend — font', () => {
  it('draws in the family it is given, not only the theme’s', () => {
    const legend = new ChartLegend();
    legend.setConfig({ fontFamily: 'Manrope, sans-serif', fontSize: 11, showSymbol: false });
    const { ctx, fonts } = recordingCtx();
    legend.render(ctx, viewport, DARK_THEME, [bar(105), bar(106)]);
    expect(fonts.length).toBeGreaterThan(0);
    for (const f of fonts) expect(f).toContain('Manrope, sans-serif');
  });

  it('draws the volume row at the size of the OHLC row', () => {
    const legend = new ChartLegend();
    legend.setConfig({ fontSize: 11, showSymbol: false });
    const { ctx, texts } = recordingCtx();
    legend.render(ctx, viewport, DARK_THEME, [bar(105), bar(106)]);
    const ohlc = texts.find((t) => t.text === 'O')!;
    const vol = texts.find((t) => t.text.startsWith('Vol'))!;
    expect(vol.font.match(/(\d+)px/)?.[1]).toBe(ohlc.font.match(/(\d+)px/)?.[1]);
  });

  it('keeps each value’s place while its digits change width', () => {
    const legend = new ChartLegend();
    legend.setConfig({ showSymbol: false, showChange: false });
    const xOfHigh = (open: number) => {
      const { ctx, texts } = recordingCtx();
      legend.render(ctx, viewport, DARK_THEME, [bar(100), { ...bar(105), open }]);
      return texts.find((t) => t.text === 'H')!.x;
    };
    // The open has as many characters but narrower digits: the H after it stays put.
    expect(xOfHigh(111.11)).toBe(xOfHigh(108.88));
  });

  it('keeps the row in place on the right too, and when the change flips sign', () => {
    const legend = new ChartLegend();
    legend.setConfig({ showSymbol: false, position: 'top-right' });
    const xOf = (label: string, prevClose: number, open: number) => {
      const { ctx, texts } = recordingCtx();
      legend.render(ctx, viewport, DARK_THEME, [bar(prevClose), { ...bar(105), open }]);
      return texts.find((t) => t.text === label)!.x;
    };
    expect(xOf('H', 100, 111.11)).toBe(xOf('H', 100, 108.88));
    // Up from 104, then down from 106: the change's sign differs, the row does not move.
    expect(xOf('O', 104, 108.88)).toBe(xOf('O', 106, 108.88));
    expect(xOf('O', 104, 108.88)).toBeLessThan(viewport.chartRect.width);
  });
});
