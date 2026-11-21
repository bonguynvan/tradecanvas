import { describe, it, expect, vi } from 'vitest';
import type { DataSeries, ViewportState } from '@tradecanvas/commons';
import { DARK_THEME } from '@tradecanvas/commons';
import { ChartLegend } from '../ChartLegend.js';

const data: DataSeries = [
  { time: 0, open: 100, high: 104, low: 99, close: 103, volume: 1200 },
  { time: 60_000, open: 103, high: 105, low: 101, close: 102, volume: 900 },
];
const plot = (width: number): ViewportState => ({
  visibleRange: { from: 0, to: 1 },
  priceRange: { min: 90, max: 110 },
  barWidth: 6,
  barSpacing: 2,
  offset: 0,
  chartRect: { x: 0, y: 0, width, height: 300 },
});
const ctx = new Proxy({} as Record<string | symbol, unknown>, {
  get: (target, prop) => (prop === 'measureText' ? (text: string) => ({ width: text.length * 7 }) : prop in target ? target[prop] : () => undefined),
  set: (target, prop, value) => {
    target[prop] = value;
    return true;
  },
}) as unknown as CanvasRenderingContext2D;

describe('the legend drawn for a picture', () => {
  it('has again the size it had on the page, and what stacks under it hears nothing', () => {
    const legend = new ChartLegend();
    legend.setSymbol('DEMO');
    const moved = vi.fn();
    legend.setResizeListener(moved);
    legend.render(ctx, plot(900), DARK_THEME, data);
    expect(moved).toHaveBeenCalledTimes(1);
    const height = legend.getHeight();
    const width = legend.getWidth();

    // A narrow picture wraps its lines: taller, and narrower.
    const inPicture = legend.keepSize(() => {
      legend.measure(ctx, plot(140), DARK_THEME, data);
      legend.render(ctx, plot(140), DARK_THEME, data);
      return { height: legend.getHeight(), width: legend.getWidth() };
    });
    expect(inPicture.height).toBeGreaterThan(height);
    expect(legend.getHeight()).toBe(height);
    expect(legend.getWidth()).toBe(width);
    expect(moved).toHaveBeenCalledTimes(1);
    // Drawn on the page again at the size it had: still nothing to tell.
    legend.render(ctx, plot(900), DARK_THEME, data);
    expect(moved).toHaveBeenCalledTimes(1);
  });

  it('reads again the bar it read on the page, after a picture that read the latest', () => {
    const legend = new ChartLegend();
    legend.setHoverBar(data[0], null);
    const texts: string[] = [];
    const writing = new Proxy(ctx, { get: (target, prop) => (prop === 'fillText' ? (text: string) => void texts.push(text) : Reflect.get(target, prop)) });
    legend.keepSize(() => {
      legend.setHoverBar(null);
      legend.render(writing, plot(900), DARK_THEME, data);
    });
    // In the picture: the latest bar's close. On the page again: the first bar's, which was pointed at.
    expect(texts).toContain('102.00');
    texts.length = 0;
    legend.render(writing, plot(900), DARK_THEME, data);
    expect(texts).toContain('103.00');
    expect(texts).not.toContain('102.00');
  });

  it('is put back when the drawing throws', () => {
    const legend = new ChartLegend();
    legend.render(ctx, plot(900), DARK_THEME, data);
    const height = legend.getHeight();
    expect(() => legend.keepSize(() => {
      legend.render(ctx, plot(140), DARK_THEME, data);
      throw new Error('the drawing broke');
    })).toThrow(/the drawing broke/);
    expect(legend.getHeight()).toBe(height);
  });
});
