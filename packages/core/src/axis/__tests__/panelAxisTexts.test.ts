import { describe, it, expect } from 'vitest';
import type { ViewportState } from '@tradecanvas/commons';
import { panelScale, panelScaleTexts, panelTagText, MIN_PANE_PLOT_HEIGHT } from '../panelAxisTexts.js';

/** A pane's viewport over `[min, max]`, its plot `height` px tall. */
function pane(min: number, max: number, height = 120, more: Partial<ViewportState> = {}): ViewportState {
  return {
    priceRange: { min, max },
    chartRect: { x: 0, y: 0, width: 400, height },
    ...more,
  } as unknown as ViewportState;
}

describe('a pane’s value scale, as its axis writes it', () => {
  it('writes each tick of its range, in the decimals of its step', () => {
    const texts = panelScaleTexts(pane(-1_800_000, -1_700_000), 'en-US');
    expect(texts.length).toBeGreaterThan(1);
    expect(texts).toContain('-1,750,000');
    expect(texts.every((t) => !t.includes('.'))).toBe(true);
  });

  it('writes none for a pane folded to its header, or flat', () => {
    expect(panelScale(pane(0, 100, MIN_PANE_PLOT_HEIGHT - 1))).toBeNull();
    expect(panelScaleTexts(pane(0, 100, MIN_PANE_PLOT_HEIGHT - 1), 'en-US')).toEqual([]);
    expect(panelScale(pane(5, 5))).toBeNull();
    expect(panelScale(pane(Number.NaN, 5))).toBeNull();
  });

  it('tags a latest value in the decimals its size takes, and in percent on a percent pane', () => {
    expect(panelTagText(-1_766_028.9, pane(-1_800_000, -1_700_000), 'en-US')).toBe('-1,766,028.9');
    expect(panelTagText(110, pane(90, 120, 120, { scaleMode: 'percentage', scaleBaseline: 100 }), 'en-US')).toBe('+10.00%');
  });
});
