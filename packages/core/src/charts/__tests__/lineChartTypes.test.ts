import { describe, it, expect, vi } from 'vitest';
import type { OHLCBar, ViewportState } from '@tradecanvas/commons';
import { DARK_THEME } from '@tradecanvas/commons';
import { createRecorder } from '../../webgl/recorder.js';
import { BaselineRenderer } from '../BaselineRenderer.js';
import { KagiRenderer } from '../KagiRenderer.js';
import { PointAndFigureRenderer } from '../PointAndFigureRenderer.js';
import { toKagi } from '../transforms/kagi.js';
import { toPointAndFigure } from '../transforms/pointAndFigure.js';

const raw: OHLCBar[] = Array.from({ length: 600 }, (_, i) => {
  const c = 100 + Math.sin(i / 9) * 10 + Math.sin(i / 1.7) * 3;
  return { time: i * 60_000, open: c - 0.4, high: c + 1, low: c - 1, close: c, volume: 10 };
});

function view(count: number, barUnit = 8): ViewportState {
  return {
    chartRect: { x: 0, y: 0, width: count * barUnit, height: 500 },
    priceRange: { min: 80, max: 120 },
    barWidth: barUnit * 0.75,
    barSpacing: barUnit * 0.25,
    offset: 0,
    visibleRange: { from: 0, to: count - 1 },
  } as ViewportState;
}

/** Whether the GPU's recording context keeps all the renderer draws, at `dpr`. */
function onGpu(draw: (c: CanvasRenderingContext2D) => void, dpr = 1): boolean {
  const rec = createRecorder(dpr, null);
  return rec.region({ x: 0, y: 0, width: 5000, height: 500 }).step(draw);
}

describe('line chart types on the GPU', () => {
  it('records a baseline chart: a line a side, round where it bends', () => {
    const vp = view(300);
    for (const dpr of [1, 2]) expect(onGpu((c) => new BaselineRenderer().render(c, raw, vp, DARK_THEME), dpr), `dpr ${dpr}`).toBe(true);
  });

  it('records a Kagi chart', () => {
    const data = toKagi(raw, 2);
    const vp = view(data.length, 12);
    for (const dpr of [1, 2]) expect(onGpu((c) => new KagiRenderer().render(c, data, vp, DARK_THEME), dpr), `dpr ${dpr}`).toBe(true);
  });

  it('records a point & figure chart', () => {
    const data = toPointAndFigure(raw, 1);
    const vp = view(data.length, 16);
    const r = new PointAndFigureRenderer();
    r.setBoxSize(1);
    for (const dpr of [1, 2]) expect(onGpu((c) => r.render(c, data, vp, DARK_THEME), dpr), `dpr ${dpr}`).toBe(true);
  });
});

describe('point & figure boxes', () => {
  it('draws boxes too small to see as solid columns, in the colour of their way', () => {
    let moves = 0;
    class CountingPath {
      moveTo() { moves++; }
      lineTo() {}
      arc() {}
    }
    vi.stubGlobal('Path2D', CountingPath);
    try {
      const r = new PointAndFigureRenderer();
      // A box of 0.01 on a scale of 40: 0.125 px a box.
      r.setBoxSize(0.01);
      const columns: OHLCBar[] = [
        { time: 0, open: 90, high: 110, low: 90, close: 110, volume: 1 },
        { time: 1, open: 109.99, high: 109.99, low: 95, close: 95, volume: 1 },
      ];
      const fills: { style: string; rect: number[] }[] = [];
      const state: Record<string, unknown> = {};
      const ctx = new Proxy(state, {
        get: (t, p) => (p === 'fillRect' ? (...rect: number[]) => fills.push({ style: String(t.fillStyle), rect }) : p in t ? t[p as string] : () => {}),
        set: (t, p, v) => { t[p as string] = v; return true; },
      }) as unknown as CanvasRenderingContext2D;
      r.render(ctx, columns, view(2, 16), DARK_THEME);
      expect(moves).toBe(0);
      expect(fills.map((f) => f.style)).toEqual([DARK_THEME.candleUp, DARK_THEME.candleDown]);
      // The X column spans 90 to 110 on a scale of 80 to 120: the middle half of the 500 px.
      const [, y, , h] = fills[0].rect;
      expect(y).toBeCloseTo(125);
      expect(h).toBeCloseTo(250);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('draws a column of a hundred million boxes as one bar, not box by box', () => {
    let moves = 0;
    class CountingPath {
      moveTo() { moves++; }
      lineTo() {}
      arc() {}
    }
    vi.stubGlobal('Path2D', CountingPath);
    try {
      const r = new PointAndFigureRenderer();
      // A column of a hundred million boxes, 0.000005 px each.
      r.setBoxSize(1e-6);
      const column: OHLCBar[] = [{ time: 0, open: 50, high: 150, low: 50, close: 150, volume: 1 }];
      const vp = { ...view(1, 16), priceRange: { min: 90, max: 110 } } as ViewportState;
      const ctx = new Proxy({}, { get: () => () => {}, set: () => true }) as unknown as CanvasRenderingContext2D;
      r.render(ctx, column, vp, DARK_THEME);
      expect(moves).toBe(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
