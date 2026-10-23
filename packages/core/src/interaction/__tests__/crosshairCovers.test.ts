import { describe, it, expect, vi } from 'vitest';
import type { DataSeries, Theme, ViewportState } from '@tradecanvas/commons';
import { LIGHT_THEME } from '@tradecanvas/commons';
import { CrosshairHandler } from '../CrosshairHandler.js';
import { PriceAxis } from '../../axis/PriceAxis.js';
import { TimeAxis } from '../../axis/TimeAxis.js';

const viewport: ViewportState = {
  visibleRange: { from: 0, to: 10 },
  priceRange: { min: 83_000, max: 85_000 },
  barWidth: 8,
  barSpacing: 2,
  offset: 0,
  chartRect: { x: 0, y: 0, width: 500, height: 400 },
  priceAxisWidth: 72,
};

const data: DataSeries = [{ time: Date.UTC(2026, 0, 1), open: 1, high: 1, low: 1, close: 1, volume: 1 }];

/** A context that notes each filled rectangle with the colour it was filled in. */
function recorder() {
  const rects: { x: number; y: number; w: number; h: number; color: string }[] = [];
  const state: Record<string, unknown> = {};
  const ctx = new Proxy(state, {
    get(target, key: string) {
      if (key === 'measureText') return (t: string) => ({ width: t.length * 7 });
      if (key === 'fillRect') return (x: number, y: number, w: number, h: number) => rects.push({ x, y, w, h, color: String(target.fillStyle) });
      if (key in target) return target[key];
      return vi.fn();
    },
    set(target, key: string, value) {
      target[key] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, rects };
}

describe('the price axis’s labelled rows', () => {
  it('are where it wrote its tick labels, without the ones a tag took', () => {
    const axis = new PriceAxis();
    axis.render(recorder().ctx, viewport, LIGHT_THEME);
    const all = [...axis.labelRows()];
    expect(all.length).toBeGreaterThan(3);
    axis.render(recorder().ctx, viewport, LIGHT_THEME, 'right', [all[1]]);
    expect(axis.labelRows()).not.toContain(all[1]);
  });
});

describe('the crosshair’s price pill', () => {
  it('clears the tick labels it would half cover, and only those', () => {
    const handler = new CrosshairHandler();
    handler.setData(data);
    handler.onPointerMove({ x: 100, y: 200 });
    const { ctx, rects } = recorder();
    // Rows 12 px and 40 px from the pointer: the first is under the pill, the second clear of it.
    handler.renderAxisLabels(ctx, viewport, LIGHT_THEME as Theme, data, undefined, [212, 240]);
    const ground = rects.filter((r) => r.color === LIGHT_THEME.background);
    expect(ground).toHaveLength(1);
    expect(ground[0].y).toBeLessThan(212);
    expect(ground[0].y + ground[0].h).toBeGreaterThan(212);
    expect(ground[0].x).toBeGreaterThan(viewport.chartRect.width);
  });
});

describe('the crosshair’s time pill', () => {
  it('clears the time labels it would half cover, and only those', () => {
    const handler = new CrosshairHandler();
    handler.setData(data);
    handler.onPointerMove({ x: 5, y: 200 }); // bar 0, at x 4
    const { ctx, rects } = recorder();
    // One label right beside the pointer, one far off.
    handler.renderAxisLabels(ctx, viewport, LIGHT_THEME as Theme, data, undefined, [], [{ left: 30, right: 60 }, { left: 300, right: 330 }]);
    const ground = rects.filter((r) => r.color === LIGHT_THEME.background);
    expect(ground).toHaveLength(1);
    expect(ground[0].x).toBeLessThanOrEqual(30);
    expect(ground[0].x + ground[0].w).toBeGreaterThanOrEqual(60);
    expect(ground[0].y).toBeGreaterThanOrEqual(viewport.chartRect.height);
  });

  it('knows the spans the time axis wrote', () => {
    const axis = new TimeAxis();
    axis.setTimezoneOffset(0);
    const hourly: DataSeries = Array.from({ length: 48 }, (_, i) => ({ time: Date.UTC(2026, 0, 1) + i * 3_600_000, open: 1, high: 1, low: 1, close: 1, volume: 1 }));
    axis.render(recorder().ctx, { ...viewport, visibleRange: { from: 0, to: 47 } }, LIGHT_THEME, hourly);
    const spans = axis.labelColumns();
    expect(spans.length).toBeGreaterThan(1);
    for (const s of spans) expect(s.right).toBeGreaterThan(s.left);
  });
});
