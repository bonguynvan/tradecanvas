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

describe('CrosshairHandler past the data', () => {
  // Bar 49 is centred at x = 394; the pointer at x = 454 is six slots past it.
  const shifted = { ...viewport, offset: 100 } as ViewportState;

  it('labels a slot past the newest bar with an extrapolated time by default', () => {
    const handler = new CrosshairHandler();
    handler.setData(bars);
    handler.onPointerMove({ x: 454, y: 150 });
    const { ctx, texts } = recorder();
    handler.renderAxisLabels(ctx, shifted, theme, bars);
    expect(texts).toHaveLength(2);
  });

  it('gives no time there when bars are not evenly spaced in time', () => {
    const handler = new CrosshairHandler();
    handler.setData(bars);
    handler.setTimesPastData(false);
    handler.onPointerMove({ x: 454, y: 150 });
    const { ctx, texts } = recorder();
    handler.renderAxisLabels(ctx, shifted, theme, bars);
    expect(texts).toHaveLength(1);

    handler.onPointerMove({ x: 384, y: 150 });
    const onBar = recorder();
    handler.renderAxisLabels(onBar.ctx, shifted, theme, bars);
    expect(onBar.texts).toHaveLength(2);
  });
});

describe('CrosshairHandler on daily bars', () => {
  const DAY = 86_400_000;
  const days = (first: number): OHLCBar[] =>
    Array.from({ length: 50 }, (_, i) => ({ time: first + i * DAY, open: 100, high: 101, low: 99, close: 100, volume: 1 }));
  const pill = (data: OHLCBar[], tz: string, exchange: string | null) => {
    const handler = new CrosshairHandler();
    handler.setData(data);
    handler.setTimezoneOffset(tz);
    handler.setExchangeTimeZone(exchange);
    handler.setSyncedSlot(2);
    const { ctx, texts } = recorder();
    handler.renderAxisLabels(ctx, viewport, theme, data);
    return texts[0];
  };

  it('dates a day built at the exchange’s midnight by the exchange’s date, in UTC and in New York', () => {
    // Ho Chi Minh City's 21 to 23 October, stamped at 17:00 UTC the day before.
    const vn = days(Date.UTC(2026, 9, 20, 17));
    expect(pill(vn, 'UTC', 'Asia/Ho_Chi_Minh')).toBe('10/23/2026');
    expect(pill(vn, 'America/New_York', 'Asia/Ho_Chi_Minh')).toBe('10/23/2026');
  });

  it('dates a day stamped at 00:00 UTC by the date it names, in New York too', () => {
    expect(pill(days(Date.UTC(2026, 9, 21)), 'America/New_York', null)).toBe('10/23/2026');
  });
});

describe('CrosshairHandler.refresh', () => {
  it('reports the bar under the pointer again, though the pointer has not moved', async () => {
    const handler = new CrosshairHandler();
    const callback = vi.fn();
    handler.setCallback(callback);
    handler.setData(bars);
    handler.onPointerMove({ x: 124, y: 150 });
    handler.render(recorder().ctx, viewport, theme);
    await Promise.resolve();
    expect(callback).toHaveBeenCalledTimes(1);
    expect(handler.getReportedBarIndex()).toBe(12);
    // The same bar on the next frame: nothing new to report.
    handler.render(recorder().ctx, viewport, theme);
    await Promise.resolve();
    expect(callback).toHaveBeenCalledTimes(1);
    handler.refresh();
    await Promise.resolve();
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback.mock.calls[1]).toEqual(callback.mock.calls[0]);
  });

  it('reports nothing with no bar under the pointer', async () => {
    const handler = new CrosshairHandler();
    const callback = vi.fn();
    handler.setCallback(callback);
    handler.setData(bars);
    expect(handler.getReportedBarIndex()).toBeNull();
    handler.refresh();
    handler.onPointerMove({ x: 124, y: 150 });
    handler.render(recorder().ctx, viewport, theme);
    await Promise.resolve();
    handler.onPointerLeave();
    callback.mockClear();
    handler.refresh();
    await Promise.resolve();
    expect(callback).not.toHaveBeenCalled();
    expect(handler.getReportedBarIndex()).toBeNull();
  });
});

describe('CrosshairHandler.formatTime', () => {
  it('writes a bar’s time as its pill does, a time formatter included', () => {
    const handler = new CrosshairHandler();
    handler.setData(bars);
    handler.setTimezoneOffset('UTC');
    handler.setSyncedSlot(2);
    const { ctx, texts } = recorder();
    handler.renderAxisLabels(ctx, viewport, theme, bars);
    expect(handler.formatTime(bars[2].time, bars)).toBe(texts[0]);
    handler.setTimeFormatter((ms) => `t${ms}`);
    expect(handler.formatTime(bars[2].time, bars)).toBe(`t${bars[2].time}`);
  });
});

describe('CrosshairHandler cursor kinds', () => {
  it('starts as the cross, and keeps the kind set', () => {
    const handler = new CrosshairHandler();
    expect(handler.getCursor()).toBe('cross');
    handler.setCursor('dot');
    expect(handler.getCursor()).toBe('dot');
  });

  it.each(['cross', 'dot'] as const)('%s: draws both lines', (kind) => {
    const handler = new CrosshairHandler();
    handler.setData(bars);
    handler.setCursor(kind);
    handler.onPointerMove({ x: 204, y: 150 });
    const { ctx, lines } = recorder();
    handler.render(ctx, viewport, theme);
    expect(lines.length).toBe(2);
  });

  it('arrow: draws no lines, but the price and time still follow the pointer on the axes', () => {
    const handler = new CrosshairHandler();
    handler.setData(bars);
    handler.setCursor('arrow');
    handler.onPointerMove({ x: 204, y: 150 });
    const drawn = recorder();
    handler.render(drawn.ctx, viewport, theme);
    expect(drawn.lines).toEqual([]);
    const labels = recorder();
    handler.renderAxisLabels(labels.ctx, viewport, theme, bars);
    expect(labels.texts).toHaveLength(2);
  });

  it('arrow: a crosshair mirrored from another chart draws no line either', () => {
    const handler = new CrosshairHandler();
    handler.setData(bars);
    handler.setCursor('arrow');
    handler.setSyncedSlot(12);
    const { ctx, lines } = recorder();
    handler.render(ctx, viewport, theme);
    expect(lines).toEqual([]);
  });

  it('shows the lines of a kind that draws them', () => {
    const handler = new CrosshairHandler();
    expect(handler.drawsLines()).toBe(true);
    handler.setCursor('arrow');
    expect(handler.drawsLines()).toBe(false);
    handler.setCursor('dot');
    handler.setMode('hidden');
    expect(handler.drawsLines()).toBe(false);
  });
});

describe('CrosshairHandler — a drawing’s span on the axes', () => {
  /** Records filled boxes as [x, y, w, h, colour] and the text with its colour. */
  function spanRecorder() {
    const boxes: (number | string)[][] = [];
    const texts: [string, string][] = [];
    const store: Record<string, unknown> = {};
    const ctx = new Proxy(store, {
      get: (target, prop) => {
        if (prop === 'measureText') return (t: string) => ({ width: t.length * 6 });
        if (prop === 'fillRect') return (x: number, y: number, w: number, h: number) => boxes.push([x, y, w, h, String(target.fillStyle)]);
        if (prop === 'fillText') return (t: string) => texts.push([t, String(target.fillStyle)]);
        if (prop in target) return target[prop as string];
        return () => {};
      },
      set: (target, prop, value) => { target[prop as string] = value; return true; },
    }) as unknown as CanvasRenderingContext2D;
    return { ctx, boxes, texts };
  }
  const span = (prices: number[], times: number[]) => ({ prices, times, color: '#ff8800', viewport: { ...viewport, data: bars } as ViewportState });

  it('tints the price axis between the two prices and labels each in the drawing’s colour', () => {
    const handler = new CrosshairHandler();
    handler.setData(bars);
    const { ctx, boxes, texts } = spanRecorder();
    handler.renderSpan(ctx, span([95, 105], []), { ...viewport, data: bars } as ViewportState, theme, bars, 300);
    // 20 points over 300 px: 105 at y 75, 95 at y 225; the axis starts at x 500.
    expect(boxes.find((b) => b[0] === 500 && b[1] === 75 && b[3] === 150)?.[4]).toMatch(/rgba\(255, 136, 0, 0\.2\)/);
    expect(texts.map(([t]) => t)).toEqual(['95.00', '105.00']);
  });

  it('tints the time axis between the two times and labels each', () => {
    const handler = new CrosshairHandler();
    handler.setData(bars);
    const { ctx, boxes, texts } = spanRecorder();
    handler.renderSpan(ctx, span([], [bars[10].time, bars[20].time]), { ...viewport, data: bars } as ViewportState, theme, bars, 300);
    // Bar 10 centred at x 104, bar 20 at x 204; the time axis starts at y 300.
    expect(boxes.some((b) => b[0] === 104 && b[1] === 300 && b[2] === 100)).toBe(true);
    expect(texts).toHaveLength(2);
  });

  it('labels a price off the plot nowhere', () => {
    const handler = new CrosshairHandler();
    handler.setData(bars);
    const { ctx, texts } = spanRecorder();
    handler.renderSpan(ctx, span([95, 500], []), { ...viewport, data: bars } as ViewportState, theme, bars, 300);
    expect(texts.map(([t]) => t)).toEqual(['95.00']);
  });
});
