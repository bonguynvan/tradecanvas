import { describe, it, expect, vi } from 'vitest';
import type { DataSeries, ViewportState } from '@tradecanvas/commons';
import { DARK_THEME } from '@tradecanvas/commons';
import { ChartLegend } from '../ChartLegend.js';

const theme = DARK_THEME;
const viewport: ViewportState = {
  visibleRange: { from: 0, to: 10 },
  priceRange: { min: 90, max: 110 },
  barWidth: 6,
  barSpacing: 2,
  offset: 0,
  chartRect: { x: 0, y: 0, width: 600, height: 300 },
};
const data: DataSeries = [
  { time: 0, open: 100, high: 104, low: 99, close: 103, volume: 1200 },
  { time: 60_000, open: 103, high: 105, low: 101, close: 102, volume: 900 },
];

/** A context that counts what is painted on it and measures a character as 7 px. */
function context() {
  const painted = vi.fn();
  const fonts: string[] = [];
  let font = '10px sans-serif';
  const ctx = {
    save: vi.fn(),
    restore: vi.fn(),
    fillText: painted,
    strokeText: painted,
    fillRect: painted,
    strokeRect: painted,
    fill: painted,
    stroke: painted,
    measureText: (text: string) => ({ width: text.length * 7 }),
    get font() {
      return font;
    },
    set font(value: string) {
      font = value;
      fonts.push(value);
    },
    fillStyle: '',
    textAlign: 'left',
    textBaseline: 'top',
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D;
  return { ctx, painted, fonts };
}

describe('the legend’s size worked out without drawing it', () => {
  it('is the size a draw gives it, and nothing is painted', () => {
    const drawn = new ChartLegend();
    drawn.setSymbol('DEMO');
    drawn.render(context().ctx, viewport, theme, data);

    const measured = new ChartLegend();
    measured.setSymbol('DEMO');
    expect(measured.getWidth()).toBe(0);
    const { ctx, painted, fonts } = context();
    measured.measure(ctx, viewport, theme, data);

    expect(painted).not.toHaveBeenCalled();
    expect(measured.getWidth()).toBeGreaterThan(0);
    expect(measured.getWidth()).toBe(drawn.getWidth());
    expect(measured.getHeight()).toBe(drawn.getHeight());
    // Measured in the legend's own fonts, and the context left as it was found.
    expect(fonts.length).toBeGreaterThan(0);
    expect(vi.mocked(ctx.save).mock.calls.length).toBe(vi.mocked(ctx.restore).mock.calls.length);
  });

  it('is none for a legend switched off, and for no bars', () => {
    const off = new ChartLegend();
    off.setConfig({ visible: false });
    off.measure(context().ctx, viewport, theme, data);
    expect(off.getWidth()).toBe(0);
    expect(off.getHeight()).toBe(0);
    const empty = new ChartLegend();
    empty.measure(context().ctx, viewport, theme, []);
    expect(empty.getWidth()).toBe(0);
  });
});
