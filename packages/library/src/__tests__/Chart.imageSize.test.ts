// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ViewportState } from '@tradecanvas/commons';
import { LIGHT_THEME } from '@tradecanvas/commons';
import { MAX_IMAGE_PIXELS, MAX_IMAGE_SIDE } from '@tradecanvas/core';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const WIDTH = 800;
const HEIGHT = 400;
const DAY = 86_400_000;
const bars = Array.from({ length: 200 }, (_, i) => {
  const close = 64_000 + Math.sin(i / 9) * 4000 + i * 60;
  return { time: Date.UTC(2026, 0, 5) + i * DAY, open: close - 300, high: close + 500, low: close - 700, close, volume: 1000 + i };
});

interface Frame {
  viewport: ViewportState;
  theme: { background: string };
  timeAxisY?: number;
  panels: { rect: { x: number; y: number; width: number; height: number } }[];
}

interface Inside {
  viewport: { getState(): ViewportState; setPriceRange(min: number, max: number): void };
  engine: { renderTo(c: CanvasRenderingContext2D): void; renderCtx: Frame | null; requestRender(): void };
}

/** A chart of 200 bars with a pane, scrolled back and zoomed, its first frames drawn. */
async function chartOnPage(): Promise<{ chart: Chart; inside: Inside; host: HTMLElement }> {
  const host = sizedHost(WIDTH, HEIGHT);
  const chart = new Chart(host, { features: { crosshair: false, barCountdown: false } });
  chart.setData(bars);
  chart.addIndicator('rsi');
  chart.setVisibleRange(bars[60].time, bars[139].time);
  await new Promise((resolve) => setTimeout(resolve, 60));
  return { chart, inside: chart as unknown as Inside, host };
}

/** The frames drawn for pictures while `take` runs, as they stood when each was drawn. */
function framesDrawn(inside: Inside, take: () => void): Frame[] {
  const frames: Frame[] = [];
  const renderTo = inside.engine.renderTo.bind(inside.engine);
  const spy = vi.spyOn(inside.engine, 'renderTo').mockImplementation((c) => {
    const frame = inside.engine.renderCtx;
    if (frame) frames.push({ ...frame, viewport: { ...frame.viewport, chartRect: { ...frame.viewport.chartRect }, visibleRange: { ...frame.viewport.visibleRange }, priceRange: { ...frame.viewport.priceRange } } });
    renderTo(c);
  });
  try {
    take();
  } finally {
    spy.mockRestore();
  }
  return frames;
}

describe('a picture of the chart at a size of its own', () => {
  beforeEach(() => installChartStubs());
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('is laid out again for the size asked for, the same bars on view', async () => {
    const { chart, inside } = await chartOnPage();
    const own = inside.viewport.getState();
    let picture: HTMLCanvasElement | null = null;
    const [frame] = framesDrawn(inside, () => {
      picture = chart.toCanvas({ width: 1600, height: 900, pixelRatio: 1 });
    });
    expect(picture).not.toBeNull();
    expect([picture!.width, picture!.height]).toEqual([1600, 900]);
    // The plot is the picture's less the scale, the pane and the time axis; the scale is at its right edge.
    const plot = frame.viewport.chartRect;
    expect(plot.x + plot.width + (frame.viewport.priceAxisWidth ?? 0)).toBe(1600);
    expect(plot.width).toBeGreaterThan(own.chartRect.width * 1.8);
    expect(frame.timeAxisY).toBeGreaterThan(820);
    expect(frame.panels[0].rect.width).toBe(plot.width);
    // The bars that were on view are the bars on view.
    expect(frame.viewport.visibleRange).toEqual(own.visibleRange);
    expect(frame.viewport.barWidth + frame.viewport.barSpacing).toBeCloseTo(((own.barWidth + own.barSpacing) * plot.width) / own.chartRect.width, 6);
    chart.destroy();
  });

  it('takes one side alone: the other is the chart’s own, as a finance chart’s is', async () => {
    const { chart } = await chartOnPage();
    const wide = chart.toCanvas({ width: 1600, pixelRatio: 1 });
    expect([wide!.width, wide!.height]).toEqual([1600, HEIGHT]);
    const low = chart.toCanvas({ height: 200, pixelRatio: 2 });
    expect([low!.width, low!.height]).toEqual([WIDTH * 2, 400]);
    chart.destroy();
  });

  it('leaves the chart on the page as it was, and says nothing of it', async () => {
    const { chart, inside, host } = await chartOnPage();
    const told: string[] = [];
    for (const type of ['visibleRangeChange', 'priceRangeChange', 'resize', 'legendResize', 'stateChange'] as const) chart.on(type, () => void told.push(type));
    const before = JSON.stringify(inside.viewport.getState());
    const frameBefore = JSON.stringify({ viewport: inside.engine.renderCtx?.viewport, panels: inside.engine.renderCtx?.panels.map((p) => p.rect), timeAxisY: inside.engine.renderCtx?.timeAxisY });
    const plotBefore = chart.getPlotRect();
    const own = [...host.querySelectorAll('canvas')].map((c) => [c.width, c.height]);

    chart.toCanvas({ width: 1600, height: 900, pixelRatio: 2 });
    chart.toCanvas({ width: 320, height: 240, theme: 'light' });

    expect(JSON.stringify(inside.viewport.getState())).toBe(before);
    expect(JSON.stringify({ viewport: inside.engine.renderCtx?.viewport, panels: inside.engine.renderCtx?.panels.map((p) => p.rect), timeAxisY: inside.engine.renderCtx?.timeAxisY })).toBe(frameBefore);
    expect(chart.getPlotRect()).toEqual(plotBefore);
    expect([...host.querySelectorAll('canvas')].map((c) => [c.width, c.height])).toEqual(own);
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(told).toEqual([]);
    expect(JSON.stringify(inside.viewport.getState())).toBe(before);
    chart.destroy();
  });

  it('keeps a price range the reader set, and fits one that is fitted', async () => {
    const { chart, inside } = await chartOnPage();
    const fitted = framesDrawn(inside, () => void chart.toCanvas({ width: 1600, height: 900 }))[0];
    // Fitted again for the taller plot: the same prices, to the margins' share.
    expect(fitted.viewport.priceRange.min).toBeCloseTo(inside.viewport.getState().priceRange.min, 0);
    // As a drag of the price scale leaves it: held, at prices of the reader's.
    chart.setAutoScale(false);
    inside.viewport.setPriceRange(50_000, 90_000);
    const held = framesDrawn(inside, () => void chart.toCanvas({ width: 1600, height: 900 }))[0];
    expect(held.viewport.priceRange).toEqual({ min: 50_000, max: 90_000 });
    expect(inside.viewport.getState().priceRange).toEqual({ min: 50_000, max: 90_000 });
    chart.destroy();
  });

  it('is drawn in another theme at another size at once, the chart’s own theme kept', async () => {
    const { chart, inside } = await chartOnPage();
    const [frame] = framesDrawn(inside, () => void chart.toCanvas({ width: 1200, height: 500, theme: 'light' }));
    expect(frame.theme.background).toBe(LIGHT_THEME.background);
    expect(frame.viewport.chartRect.x + frame.viewport.chartRect.width + (frame.viewport.priceAxisWidth ?? 0)).toBe(1200);
    expect(chart.getTheme().background).not.toBe(LIGHT_THEME.background);
    chart.destroy();
  });

  it('reads a size that is none as the chart’s own, and holds one past what a canvas can be', async () => {
    const { chart } = await chartOnPage();
    for (const size of [{ width: 0, height: 0 }, { width: Number.NaN }, { height: -5 }, { width: Number.POSITIVE_INFINITY }]) {
      const picture = chart.toCanvas({ ...size, pixelRatio: 1 });
      expect([picture!.width, picture!.height], JSON.stringify(size)).toEqual([WIDTH, HEIGHT]);
    }
    const vast = chart.toCanvas({ width: 1e6, height: 1e6, pixelRatio: 4 });
    expect(vast).not.toBeNull();
    expect(Math.max(vast!.width, vast!.height)).toBeLessThanOrEqual(MAX_IMAGE_SIDE);
    expect(vast!.width * vast!.height).toBeLessThanOrEqual(MAX_IMAGE_PIXELS);
    chart.destroy();
  });

  it('goes to paper at the size asked for', async () => {
    const { chart } = await chartOnPage();
    const taken = vi.spyOn(chart, 'toCanvas');
    await chart.toPdf({ width: 1123, height: 794 });
    expect(taken).toHaveBeenLastCalledWith(expect.objectContaining({ width: 1123, height: 794 }));
    chart.print({ width: 900, height: 500 });
    expect(taken).toHaveBeenLastCalledWith(expect.objectContaining({ width: 900, height: 500 }));
    chart.destroy();
  });

  it('puts the chart back as it was when the drawing throws', async () => {
    const { chart, inside } = await chartOnPage();
    const before = JSON.stringify(inside.viewport.getState());
    const plotBefore = chart.getPlotRect();
    vi.spyOn(inside.engine, 'renderTo').mockImplementation(() => {
      throw new Error('the drawing broke');
    });
    expect(() => chart.toCanvas({ width: 1600, height: 900 })).toThrow(/the drawing broke/);
    expect(JSON.stringify(inside.viewport.getState())).toBe(before);
    expect(chart.getPlotRect()).toEqual(plotBefore);
    chart.destroy();
  });
});
