import { describe, it, expect } from 'vitest';
import type { Theme, ViewportState } from '@tradecanvas/commons';
import { GRAPHITE_DARK_THEME, GRAPHITE_LIGHT_THEME, MODERN_LIGHT_THEME, contrastRatio, resolveChartTheme } from '@tradecanvas/commons';
import { drawAxisBadge } from '../tradingTags.js';

const viewport = {
  visibleRange: { from: 0, to: 1 },
  priceRange: { min: 90, max: 110 },
  barWidth: 8,
  barSpacing: 2,
  offset: 0,
  chartRect: { x: 0, y: 0, width: 300, height: 200 },
} as ViewportState;

/** An order's or a position's tag on the axis as drawn: the colours filled before its figure, and the figure's own. */
function badge(theme: Theme, color: string): { fills: string[]; ink: string } {
  const fills: string[] = [];
  let ink = '';
  const state: Record<string, unknown> = { fillStyle: '' };
  const ctx = new Proxy(state, {
    get(target, key: string) {
      if (key in target) return target[key];
      if (key === 'fillRect' || key === 'fill') return () => { fills.push(String(target.fillStyle)); };
      if (key === 'fillText') return () => { ink = String(target.fillStyle); };
      if (key === 'getTransform') return () => ({ a: 1 });
      return () => {};
    },
    set(target, key: string, value) { target[key] = value; return true; },
  }) as unknown as CanvasRenderingContext2D;
  drawAxisBadge(ctx, 100, '100.00', color, viewport, theme);
  return { fills, ink };
}

const resolved = (theme: Theme, overrides = {}) => resolveChartTheme(theme, 'candlestick', overrides) as Theme;

describe('an order’s and a position’s tag on the price axis', () => {
  // A buy's green, a sell's red, an entry's blue: colours of a middle lightness.
  const colours = ['#0b8f6f', '#d93f45', '#3b82f6', '#2fc29a', '#f2665c'];

  it('is outlined where the theme outlines the values on its axis: the last price is the one block there', () => {
    for (const theme of [GRAPHITE_DARK_THEME, GRAPHITE_LIGHT_THEME]) {
      for (const color of colours) {
        const { fills, ink } = badge(resolved(theme), color);
        // An edge in the line's colour, then the chart's ground over its inside.
        expect(fills[0], color).toBe(color);
        expect(fills.at(-1), color).toBe(theme.background);
        expect(contrastRatio(ink, theme.background)!, `${theme.name} ${color}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('is filled in the other themes, and where the key says so, in a colour its figure reads on at 4.5:1', () => {
    for (const theme of [resolved(MODERN_LIGHT_THEME), resolved(GRAPHITE_LIGHT_THEME, { 'axis.price.valueTagsOutlined': false })]) {
      for (const color of colours) {
        const { fills, ink } = badge(theme, color);
        expect(fills, color).toHaveLength(1);
        expect(contrastRatio(ink, fills[0])!, color).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
