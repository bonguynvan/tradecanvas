import { describe, it, expect, vi } from 'vitest';
import type { OHLCBar, Theme, ViewportState } from '@tradecanvas/commons';
import { DARK_THEME } from '@tradecanvas/commons';
import { CrosshairHandler } from '../CrosshairHandler.js';

const bars: OHLCBar[] = Array.from({ length: 50 }, (_, i) => ({
  time: Date.UTC(2026, 0, 1) + i * 300_000, open: 100, high: 101, low: 99, close: 100, volume: 1,
}));

// 10 px per bar, bar 0 centred at x = 4.
const viewport = {
  visibleRange: { from: 0, to: 49 },
  priceRange: { min: 90, max: 110 },
  barWidth: 8,
  barSpacing: 2,
  offset: 0,
  chartRect: { x: 0, y: 0, width: 500, height: 300 },
} as ViewportState;

/** Records strokes as [x0, y0, x1, y1] and filled text. */
function recorder() {
  const lines: number[][] = [];
  const texts: string[] = [];
  let from: number[] = [];
  const ctx = {
    setLineDash() {}, beginPath() {}, stroke() {}, fill() {}, closePath() {}, fillRect() {},
    save() {}, restore() {}, quadraticCurveTo() {}, arcTo() {}, roundRect() {},
    moveTo(x: number, y: number) { from = [x, y]; },
    lineTo(x: number, y: number) { lines.push([...from, x, y]); from = [x, y]; },
    measureText: (t: string) => ({ width: t.length * 6 }),
    fillText(t: string) { texts.push(t); },
  } as unknown as CanvasRenderingContext2D;
  return { ctx, lines, texts };
}

const theme = DARK_THEME as Theme;

describe('CrosshairHandler mirrored crosshair', () => {
  it('draws only a vertical line on the mirrored bar, and fires no callback', async () => {
    const handler = new CrosshairHandler();
    const callback = vi.fn();
    handler.setCallback(callback);
    handler.setData(bars);
    handler.setSyncedSlot(12);

    const { ctx, lines } = recorder();
    handler.render(ctx, viewport, theme);
    await Promise.resolve();

    expect(lines).toEqual([[124.5, 0, 124.5, 300]]);
    expect(callback).not.toHaveBeenCalled();
  });

  it('labels the mirrored bar on the time axis but not the price axis', () => {
    const handler = new CrosshairHandler();
    handler.setData(bars);
    handler.setSyncedSlot(12);
    const { ctx, texts } = recorder();
    handler.renderAxisLabels(ctx, viewport, theme, bars);
    expect(texts).toHaveLength(1);
  });

  it('gives way to the pointer, and draws nothing once cleared', () => {
    const handler = new CrosshairHandler();
    handler.setData(bars);
    handler.setSyncedSlot(12);
    handler.onPointerMove({ x: 204, y: 150 });
    const pointer = recorder();
    handler.render(pointer.ctx, viewport, theme);
    expect(pointer.lines.map((l) => l[0])).toEqual([204.5, 0]); // vertical at the pointer, then horizontal

    handler.onPointerLeave();
    handler.setSyncedSlot(null);
    const cleared = recorder();
    handler.render(cleared.ctx, viewport, theme);
    expect(cleared.lines).toEqual([]);
  });

  it('ignores a non-numeric slot', () => {
    const handler = new CrosshairHandler();
    handler.setSyncedSlot(Number.NaN);
    expect(handler.getSyncedSlot()).toBeNull();
  });
});

describe('CrosshairHandler over indicator panes', () => {
  /** Hover at (x, y) and report what the callback heard and what was drawn. */
  const hover = async (handler: CrosshairHandler, y: number, vp: ViewportState = viewport) => {
    const callback = vi.fn();
    handler.setCallback(callback);
    handler.setData(bars);
    handler.onPointerMove({ x: 124, y }); // over bar 12
    const { ctx, lines } = recorder();
    handler.render(ctx, vp, theme);
    await Promise.resolve();
    return { callback, lines };
  };

  it('reports the hovered bar over a pane below without drawing there', async () => {
    const handler = new CrosshairHandler();
    handler.setReportBounds({ top: 0, bottom: 400 }); // a 100 px pane under the 300 px price pane
    const { callback, lines } = await hover(handler, 360);
    expect(callback).toHaveBeenCalledWith(12, { x: 124, y: 360 });
    expect(lines).toEqual([]);
  });

  it('reports over a pane above the price pane too', async () => {
    const handler = new CrosshairHandler();
    handler.setReportBounds({ top: 0, bottom: 400 });
    const below = { ...viewport, chartRect: { x: 0, y: 100, width: 500, height: 300 } };
    const { callback } = await hover(handler, 50, below);
    expect(callback).toHaveBeenCalledWith(12, { x: 124, y: 50 });
  });

  it('stays quiet past the panes (time axis) and without panes', async () => {
    const bounded = new CrosshairHandler();
    bounded.setReportBounds({ top: 0, bottom: 400 });
    expect((await hover(bounded, 420)).callback).not.toHaveBeenCalled();
    expect((await hover(new CrosshairHandler(), 360)).callback).not.toHaveBeenCalled();
  });
});
