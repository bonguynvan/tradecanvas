import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OHLCBar, ViewportState } from '@tradecanvas/commons';
import { DARK_THEME } from '@tradecanvas/commons';
import { barColumns, crispX, crispY, inDevicePixels } from '../pixelGrid.js';
import { CandlestickRenderer } from '../CandlestickRenderer.js';

/** A context with a transform: `ratio` device pixels per CSS pixel. */
function ctxWithRatio(ratio: number, calls: string[] = []) {
  let matrix = { a: ratio, b: 0, c: 0, d: ratio, e: 0, f: 0 };
  return new Proxy({}, {
    get: (_t, prop: string) => {
      if (prop === 'getTransform') return () => ({ ...matrix });
      if (prop === 'setTransform') return (a: number, b: number, c: number, d: number, e: number, f: number) => {
        calls.push('setTransform');
        matrix = { a, b, c, d, e, f };
      };
      return () => { calls.push(prop); };
    },
    set: () => true,
  }) as unknown as CanvasRenderingContext2D;
}

describe('barColumns', () => {
  it('centres the wick on the body: equal margins either side', () => {
    for (const ratio of [1, 1.25, 1.5, 2, 3]) {
      for (const width of [1, 2, 3, 4.6, 6, 7.3, 12, 30]) {
        const { body, wick } = barColumns(width, ratio);
        expect(Number.isInteger(body) && Number.isInteger(wick)).toBe(true);
        expect((body - wick) % 2).toBe(0);
        expect(body).toBeGreaterThanOrEqual(wick);
      }
    }
  });

  it('makes the wick one CSS pixel, at least one device pixel', () => {
    expect(barColumns(6, 1).wick).toBe(1);
    expect(barColumns(6, 2).wick).toBe(2);
    expect(barColumns(6, 1.25).wick).toBe(1);
    expect(barColumns(6, 3).wick).toBe(3);
  });

  it('keeps the body close to the bar width', () => {
    expect(barColumns(6, 2).body).toBe(12);
    expect(Math.abs(barColumns(7.3, 1).body - 7.3)).toBeLessThanOrEqual(1.3);
  });
});

describe('inDevicePixels', () => {
  it('maps CSS to whole device pixels and puts the transform back', () => {
    const calls: string[] = [];
    const ctx = ctxWithRatio(2, calls);
    const seen = inDevicePixels(ctx, (grid) => [grid.ratio, grid.x(10.3), grid.y(4.74)]);
    expect(seen).toEqual([2, 21, 9]);
    expect(calls).toEqual(['save', 'setTransform', 'restore']);
  });

  it('works as one-to-one when the context has no transform to read', () => {
    const ctx = new Proxy({}, { get: () => () => undefined, set: () => true }) as unknown as CanvasRenderingContext2D;
    expect(inDevicePixels(ctx, (grid) => [grid.ratio, grid.x(3.6)])).toEqual([1, 4]);
  });
});

describe('crisp candles', () => {
  let rects: number[][];
  class RecordingPath {
    rect(x: number, y: number, w: number, h: number) { rects.push([x, y, w, h]); }
    moveTo() {}
    lineTo() {}
  }
  beforeEach(() => {
    rects = [];
    vi.stubGlobal('Path2D', RecordingPath);
  });
  afterEach(() => vi.unstubAllGlobals());

  const bars: OHLCBar[] = [
    { time: 0, open: 120, high: 180, low: 110, close: 170, volume: 1 },
    { time: 1, open: 170, high: 175, low: 105, close: 115, volume: 1 },
  ];
  const vp = {
    visibleRange: { from: 0, to: 1 }, priceRange: { min: 100, max: 200 },
    barWidth: 7.3, barSpacing: 2.1, offset: 0.37, chartRect: { x: 0, y: 0, width: 400, height: 300 },
  } as ViewportState;

  it('lands every wick and body on whole device pixels, the wick in the middle of its body', () => {
    for (const ratio of [1, 1.25, 2]) {
      rects = [];
      new CandlestickRenderer().render(ctxWithRatio(ratio), bars, vp, DARK_THEME);
      expect(rects.flat().every(Number.isInteger)).toBe(true);
      // Per bar: a wick (narrow) and a body (wide).
      const { body, wick } = barColumns(vp.barWidth, ratio);
      const wicks = rects.filter((r) => r[2] === wick);
      const bodies = rects.filter((r) => r[2] === body);
      expect(wicks).toHaveLength(2);
      expect(bodies).toHaveLength(2);
      bodies.forEach((b) => {
        const w = wicks.find((x) => x[0] - b[0] === (body - wick) / 2);
        expect(w, `ratio ${ratio}`).toBeDefined();
      });
    }
  });
});

describe('crispY / crispX', () => {
  const ctx = (ratio: number) => ctxWithRatio(ratio);
  it('puts an odd-width line on a pixel centre and an even one on a pixel edge', () => {
    expect(crispY(ctx(1), 50.3, 1)).toEqual({ y: 50.5, width: 1 });
    expect(crispY(ctx(1), 50.3, 2)).toEqual({ y: 50, width: 2 });
    expect(crispY(ctx(2), 50.3, 1)).toEqual({ y: 50.5, width: 1 });
    expect(crispX(ctx(2), 10.2, 1.5)).toEqual({ x: 10.25, width: 1.5 });
  });

  it('never makes a line thinner than one device pixel', () => {
    expect(crispY(ctx(1), 10, 0.2).width).toBe(1);
    expect(crispY(ctx(2), 10, 0.2).width).toBe(0.5);
  });
});

describe('one column rule for bars and lines', () => {
  it('puts a wick on the device column a 1 px vertical line at the same x strokes', () => {
    for (const ratio of [1, 1.25, 1.5, 2, 3]) {
      for (const x of [10, 10.2, 10.5, 10.7, 33.33]) {
        const wick = barColumns(7, ratio).wick;
        const left = inDevicePixels(ctxWithRatio(ratio), (g) => g.left(x, wick));
        const line = crispX(ctxWithRatio(ratio), x, wick / ratio);
        const lineLeft = line.x * ratio - (line.width * ratio) / 2;
        expect(lineLeft, `ratio ${ratio}, x ${x}`).toBeCloseTo(left, 9);
      }
    }
  });
});

describe('dense columns', () => {
  let rects: number[][];
  class RecordingPath {
    rect(x: number, y: number, w: number, h: number) { rects.push([x, y, w, h]); }
    moveTo() {}
    lineTo() {}
  }
  beforeEach(() => {
    rects = [];
    vi.stubGlobal('Path2D', RecordingPath);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('leaves no gap between neighbouring columns at 125%', async () => {
    const { renderDenseBars } = await import('../denseBars.js');
    const bars: OHLCBar[] = Array.from({ length: 400 }, (_, i) => ({ time: i, open: 100, high: 110 + (i % 5), low: 90, close: 100 + (i % 2), volume: 1 }));
    const vp = {
      visibleRange: { from: 0, to: 399 }, priceRange: { min: 80, max: 120 },
      barWidth: 0.3, barSpacing: 0.2, offset: 0, chartRect: { x: 0, y: 0, width: 200, height: 100 },
    } as ViewportState;
    renderDenseBars(ctxWithRatio(1.25), bars, vp, '#0f0', '#f00');
    const spans = rects.map(([x, , w]) => [x, x + w]).sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < spans.length; i++) expect(spans[i][0]).toBe(spans[i - 1][1]);
  });
});
