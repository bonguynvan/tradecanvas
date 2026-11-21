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
  crosshairHandler: unknown;
  /** The bar the legend read when the frame was drawn: the one pointed at, or none (it reads the latest). */
  legendBar?: unknown;
  chartLegend?: { hoverBar?: unknown } | null;
  measureOverlay: unknown;
  selectionBoxOverlay?: unknown;
  priceAxisAddButton?: unknown;
}

interface Inside {
  viewport: { getState(): ViewportState; setPriceRange(min: number, max: number): void };
  engine: { renderTo(c: CanvasRenderingContext2D): void; renderNow(): void; renderCtx: Frame | null; requestRender(): void };
  priceFit: { snapshot(): unknown };
  priceAxisWidth: number;
  leftAxisWidth: number;
}

/** A chart of 200 bars with a pane and a scale at the left, scrolled back and zoomed, its first frames drawn. */
async function chartOnPage(options: ConstructorParameters<typeof Chart>[1] = { features: { crosshair: false, barCountdown: false } }): Promise<{ chart: Chart; inside: Inside; host: HTMLElement }> {
  const host = sizedHost(WIDTH, HEIGHT);
  const chart = new Chart(host, options);
  chart.setData(bars);
  chart.addIndicator('rsi');
  chart.addIndicator('ema', { period: 8 }, 'bottom', { scale: 'left' });
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
    if (frame) frames.push({ ...frame, legendBar: frame.chartLegend?.hoverBar ?? null, viewport: { ...frame.viewport, chartRect: { ...frame.viewport.chartRect }, visibleRange: { ...frame.viewport.visibleRange }, priceRange: { ...frame.viewport.priceRange } } });
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
    // What the layout and the price scale keep that the viewport does not show.
    const kept = (): string => JSON.stringify([inside.priceFit.snapshot(), inside.priceAxisWidth, inside.leftAxisWidth, chart.isLeftPriceScaleShown(), chart.getIndicatorPanes().map((p) => p.rect)]);
    const keptBefore = kept();
    expect(plotBefore.x).toBeGreaterThan(0);
    const own = [...host.querySelectorAll('canvas')].map((c) => [c.width, c.height]);

    chart.toCanvas({ width: 1600, height: 900, pixelRatio: 2 });
    chart.toCanvas({ width: 320, height: 240, theme: 'light' });

    expect(JSON.stringify(inside.viewport.getState())).toBe(before);
    expect(JSON.stringify({ viewport: inside.engine.renderCtx?.viewport, panels: inside.engine.renderCtx?.panels.map((p) => p.rect), timeAxisY: inside.engine.renderCtx?.timeAxisY })).toBe(frameBefore);
    expect(chart.getPlotRect()).toEqual(plotBefore);
    expect(kept()).toBe(keptBefore);
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

  it('has nothing that follows the pointer on it, and tells the page’s crosshair nothing', async () => {
    const { chart, inside } = await chartOnPage({ features: { barCountdown: false } });
    chart.setCrosshairPosition({ x: 300, y: 100 });
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(inside.engine.renderCtx?.crosshairHandler).not.toBeNull();
    const moves: unknown[] = [];
    chart.on('crosshairMove', (event) => void moves.push(event.payload));
    chart.on('crosshairLeave', () => void moves.push('left'));

    const [frame] = framesDrawn(inside, () => void chart.toCanvas({ width: 1600, height: 900, pixelRatio: 1 }));
    // The pointer is at a place on the page: at another size that place is no bar's.
    expect(frame.crosshairHandler).toBeNull();
    // With no crosshair to say which bar, the legend reads the latest; the page's reads the one pointed at, as before.
    expect(frame.legendBar).toBeNull();
    expect(inside.engine.renderCtx?.chartLegend?.hoverBar ?? null).not.toBeNull();
    expect(frame.measureOverlay).toBeNull();
    expect(frame.selectionBoxOverlay ?? null).toBeNull();
    expect(frame.priceAxisAddButton ?? null).toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(moves).toEqual([]);
    // The page's own frame has its crosshair still.
    expect(inside.engine.renderCtx?.crosshairHandler).not.toBeNull();
    chart.destroy();
  });

  it('draws the page’s own frame again at once, so nothing is pressed where the picture had it', async () => {
    const { chart, inside } = await chartOnPage();
    const now = vi.spyOn(inside.engine, 'renderNow');
    chart.toCanvas({ width: 1600, height: 900 });
    expect(now).toHaveBeenCalledTimes(1);
    chart.toCanvas({ theme: 'light' });
    expect(now).toHaveBeenCalledTimes(2);
    // One at the screen's size in its own theme changed nothing a frame keeps.
    chart.toCanvas({ pixelRatio: 2 });
    expect(now).toHaveBeenCalledTimes(2);
    // A paused chart draws when it is shown again, not now.
    chart.suspend();
    const later = vi.spyOn(inside.engine, 'requestRender');
    chart.toCanvas({ width: 1600, height: 900 });
    expect(now).toHaveBeenCalledTimes(2);
    expect(later).toHaveBeenCalled();
    chart.destroy();
  });

  it('is no picture at a size with no room for a plot, and none from inside another', async () => {
    const { chart, inside } = await chartOnPage();
    const before = JSON.stringify(inside.viewport.getState());
    expect(chart.toCanvas({ width: 60, height: 30 })).toBeNull();
    expect(chart.toCanvas({ width: 4, height: 400 })).toBeNull();
    expect(JSON.stringify(inside.viewport.getState())).toBe(before);
    // A picture asked for while one is being drawn would lay the chart out under it.
    let inner: HTMLCanvasElement | null | undefined;
    const renderTo = inside.engine.renderTo.bind(inside.engine);
    vi.spyOn(inside.engine, 'renderTo').mockImplementation((c) => {
      if (inner === undefined) inner = chart.toCanvas({ width: 500, height: 300 });
      renderTo(c);
    });
    const outer = chart.toCanvas({ width: 1600, height: 900, pixelRatio: 1 });
    expect(inner).toBeNull();
    expect([outer!.width, outer!.height]).toEqual([1600, 900]);
    expect(JSON.stringify(inside.viewport.getState())).toBe(before);
    chart.destroy();
  });

  it('keeps the middle of what is on view where bars cannot be as wide or as narrow as the size would make them', async () => {
    const { chart, inside } = await chartOnPage();
    const own = inside.viewport.getState().visibleRange;
    const middle = (own.from + own.to) / 2;
    for (const width of [160, 8000]) {
      const [frame] = framesDrawn(inside, () => void chart.toCanvas({ width, height: 600, pixelRatio: 1 }));
      const { from, to } = frame.viewport.visibleRange;
      expect(Math.abs((from + to) / 2 - middle), `${width}`).toBeLessThanOrEqual(2);
    }
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
