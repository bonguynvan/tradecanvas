import { describe, it, expect } from 'vitest';
import { DARK_THEME, LIGHT_THEME, TC_PALETTE, TC_SERIES_COLORS } from '@tradecanvas/commons';

/** WCAG relative luminance of a #rrggbb colour. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('TradeCanvas palette', () => {
  it('keeps theme-neutral colours at 3:1 on both the dark and the light theme', () => {
    // amber is the dark-surface brand accent and ink is the dark ground itself.
    const neutral = Object.entries(TC_PALETTE)
      .filter(([name]) => name !== 'amber' && name !== 'ink')
      .map(([, color]) => color);
    for (const color of [...neutral, ...TC_SERIES_COLORS]) {
      expect(contrast(color, DARK_THEME.background), `${color} on dark`).toBeGreaterThanOrEqual(3);
      expect(contrast(color, LIGHT_THEME.background), `${color} on light`).toBeGreaterThanOrEqual(3);
    }
  });

  it('gives the main series line 3:1 on its own theme', () => {
    for (const theme of [DARK_THEME, LIGHT_THEME]) {
      expect(contrast(theme.lineColor, theme.background), `${theme.name} line`).toBeGreaterThanOrEqual(3);
    }
  });

  it('gives each theme candles that stand out from its background', () => {
    for (const theme of [DARK_THEME, LIGHT_THEME]) {
      expect(contrast(theme.candleUp, theme.background), `${theme.name} up`).toBeGreaterThanOrEqual(3);
      expect(contrast(theme.candleDown, theme.background), `${theme.name} down`).toBeGreaterThanOrEqual(3);
    }
  });

  it('keeps axis and legend text readable', () => {
    for (const theme of [DARK_THEME, LIGHT_THEME]) {
      expect(contrast(theme.text, theme.background), `${theme.name} text`).toBeGreaterThanOrEqual(7);
      expect(contrast(theme.textSecondary, theme.background), `${theme.name} secondary`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('uses distinct colours for auto-coloured indicators', () => {
    expect(new Set(TC_SERIES_COLORS).size).toBe(TC_SERIES_COLORS.length);
  });
});
