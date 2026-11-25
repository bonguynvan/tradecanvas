import { describe, it, expect } from 'vitest';
import { DARK_THEME, GRAPHITE_DARK_THEME, GRAPHITE_LIGHT_THEME, contrastRatio } from '@tradecanvas/commons';
import { chartFont, chartTypeSize, readoutTextColors } from '../chartType.js';

describe('the chart’s smaller type', () => {
  it('is the theme’s small size and the steps under it, where it was 11, 10 and 9 px in every theme', () => {
    expect([0, 1, 2].map((down) => chartTypeSize(DARK_THEME, down))).toEqual([11, 10, 10]);
    expect([0, 1, 2].map((down) => chartTypeSize(GRAPHITE_DARK_THEME, down))).toEqual([12, 11, 10]);
    // A widget grown for a wide screen: the small type grows with the rest.
    const grown = { ...GRAPHITE_DARK_THEME, font: { ...GRAPHITE_DARK_THEME.font, sizeSmall: 14 } };
    expect(chartTypeSize(grown, 1)).toBe(13);
  });

  it('never goes under 10 px, nor under a theme’s own small size where that is smaller', () => {
    // Two steps under 11 was 9 px: a name beside a line that nobody could read.
    expect(chartTypeSize(DARK_THEME, 2)).toBe(10);
    expect(chartTypeSize(DARK_THEME, 5)).toBe(10);
    const tiny = { ...DARK_THEME, font: { ...DARK_THEME.font, sizeSmall: 8 } };
    expect(chartTypeSize(tiny, 2)).toBe(8);
  });

  it('stays inside a box of a set height, however large the theme’s type is', () => {
    const grown = { ...GRAPHITE_DARK_THEME, font: { ...GRAPHITE_DARK_THEME.font, sizeSmall: 16 } };
    // A tag 14 px tall holds 11 px type: 10 px in a theme at 11, 11 in Graphite, and 11 still on a grown widget.
    expect([DARK_THEME, GRAPHITE_DARK_THEME, grown].map((theme) => chartTypeSize(theme, 1, 14))).toEqual([10, 11, 11]);
    expect(chartFont(grown, 1, 'bold', 14)).toBe(`bold 11px ${grown.font.family}`);
    // A box too small for the floor holds what it holds.
    expect(chartTypeSize(DARK_THEME, 2, 12)).toBe(9);
  });

  it('gives a rise’s and a fall’s colours as text that reads on the ground, and a theme with no text colour its own', () => {
    const light = readoutTextColors(GRAPHITE_LIGHT_THEME);
    for (const colour of [light.up, light.down]) expect(contrastRatio(colour, GRAPHITE_LIGHT_THEME.background)!).toBeGreaterThanOrEqual(4.5);
    const standIn = { candleUp: '#0b8f6f', candleDown: '#d93f45', background: '#ffffff', font: DARK_THEME.font } as never;
    expect(readoutTextColors(standIn)).toEqual({ up: '#0b8f6f', down: '#d93f45' });
  });

  it('writes a canvas font in the theme’s face', () => {
    expect(chartFont(GRAPHITE_DARK_THEME, 1, '600')).toBe(`600 11px ${GRAPHITE_DARK_THEME.font.family}`);
    expect(chartFont(DARK_THEME)).toBe(`11px ${DARK_THEME.font.family}`);
  });
});
