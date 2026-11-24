import { describe, it, expect } from 'vitest';
import type { OHLCBar, Theme, ViewportState } from '@tradecanvas/commons';
import { GRAPHITE_DARK_THEME, GRAPHITE_LIGHT_THEME, MODERN_LIGHT_THEME, contrastRatio, resolveChartTheme } from '@tradecanvas/commons';
import { PriceLines } from '../PriceLines.js';

const viewport = {
  visibleRange: { from: 0, to: 1 },
  priceRange: { min: 90, max: 110 },
  barWidth: 8,
  barSpacing: 2,
  offset: 0,
  chartRect: { x: 0, y: 0, width: 300, height: 200 },
} as ViewportState;
const bars: OHLCBar[] = [{ time: 1, open: 100, high: 105, low: 95, close: 100, volume: 1 }];

/** Each tag as drawn: the colours filled before its text, and the text's own. */
function tags(theme: Theme) {
  const out: { fills: string[]; ink: string; text: string }[] = [];
  let fills: string[] = [];
  const state = { fillStyle: '' };
  const ctx = new Proxy(state as Record<string, unknown>, {
    get(target, key: string) {
      if (key === 'fillStyle') return target.fillStyle;
      if (key === 'fillRect' || key === 'fill') return () => { fills.push(String(target.fillStyle)); };
      if (key === 'fillText') return (text: string) => { out.push({ fills, ink: String(target.fillStyle), text }); fills = []; };
      if (key === 'getTransform') return () => ({ a: 1 });
      return () => {};
    },
    set(target, key: string, value) { target[key] = value; return true; },
  }) as unknown as CanvasRenderingContext2D;
  const lines = new PriceLines();
  lines.setBidAsk({ bid: 99, ask: 101 });
  lines.setHighLow(true);
  lines.renderAxisTags(ctx, viewport, theme, bars);
  return out;
}

const resolved = (theme: Theme, overrides = {}) => resolveChartTheme(theme, 'candlestick', overrides) as Theme;

describe('the quote lines’ tags on the price axis', () => {
  it('are outlined where the theme outlines the values on its axis: the chart’s ground inside, the figure in the line’s colour at 4.5:1', () => {
    for (const theme of [GRAPHITE_DARK_THEME, GRAPHITE_LIGHT_THEME]) {
      const drawn = tags(resolved(theme));
      expect(drawn).toHaveLength(4);
      for (const tag of drawn) {
        // An edge in the line's colour, then the ground over its inside.
        expect(tag.fills.at(-1), tag.text).toBe(theme.background);
        expect(contrastRatio(tag.ink, theme.background)!, `${theme.name} ${tag.text}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('are filled in the other themes, and where the key says so, in a colour their ink reads on at 4.5:1', () => {
    for (const theme of [resolved(MODERN_LIGHT_THEME), resolved(GRAPHITE_LIGHT_THEME, { 'axis.price.valueTagsOutlined': false })]) {
      const drawn = tags(theme);
      expect(drawn).toHaveLength(4);
      for (const tag of drawn) {
        expect(tag.fills).toHaveLength(1);
        expect(contrastRatio(tag.ink, tag.fills[0])!, tag.text).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
