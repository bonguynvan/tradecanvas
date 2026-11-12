import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OHLCBar, ViewportState } from '@tradecanvas/commons';
import { DARK_THEME } from '@tradecanvas/commons';
import { barColumns, crispBox, crispX, crispY, hLine, inDevicePixels, vLine, PIXEL_ROUNDING } from '../pixelGrid.js';
import { CandlestickRenderer } from '../CandlestickRenderer.js';
import { VolumeCandleRenderer } from '../VolumeCandleRenderer.js';
import { CANDLE_BARS_VS } from '../../webgl/shaders.js';

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

  it('rounds up from a hair under the half, so a bar exactly on one lands alike on the GPU', () => {
    // A 5.1 px bar step at ratio 2 puts every fifth bar on half a device
    // pixel, which 64-bit arithmetic may see a hair under and 32-bit over.
    const seen = inDevicePixels(ctxWithRatio(2), (grid) => [grid.x(10.25), grid.x(10.2499), grid.x(10.24), grid.left(10.2499, 2)]);
    expect(seen).toEqual([21, 21, 20, 20]);
    expect(crispX(ctxWithRatio(1), 10.9999, 1).x).toBe(11.5);
    expect(CANDLE_BARS_VS).toContain(`float snap(float v) { return floor(v + ${PIXEL_ROUNDING.toFixed(4)}); }`);
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

describe('crisp volume candles', () => {
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
    { time: 0, open: 120, high: 180, low: 110, close: 170, volume: 1000 },
    { time: 1, open: 170, high: 175, low: 105, close: 115, volume: 300 },
  ];
  const vp = {
    visibleRange: { from: 0, to: 1 }, priceRange: { min: 100, max: 200 },
    barWidth: 9.3, barSpacing: 2.1, offset: 0.37, chartRect: { x: 0, y: 0, width: 400, height: 300 },
  } as ViewportState;

  it('lands wicks and bodies on whole device pixels, the body as wide as its volume, the wick in its middle', () => {
    for (const ratio of [1, 1.25, 2]) {
      rects = [];
      new VolumeCandleRenderer().render(ctxWithRatio(ratio), bars, vp, DARK_THEME);
      expect(rects.flat().every(Number.isInteger), `ratio ${ratio}`).toBe(true);
      // Bar by bar: the wick, then the body.
      const [upWick, upBody, downWick, downBody] = rects;
      const { wick } = barColumns(vp.barWidth, ratio);
      expect([upWick[2], downWick[2]]).toEqual([wick, wick]);
      expect(upBody[2]).toBe(barColumns(vp.barWidth, ratio).body);
      expect(downBody[2]).toBeLessThan(upBody[2]);
      expect(upBody[0] + (upBody[2] - wick) / 2).toBe(upWick[0]);
      expect(downBody[0] + (downBody[2] - wick) / 2).toBe(downWick[0]);
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

  it('draws a 1 px line one device pixel wide at 125% and at 150%, on a pixel’s centre', () => {
    for (const ratio of [1.25, 1.5, 1.75]) {
      for (const at of [50.5, 51.5, 117.5, 300.5]) {
        const row = crispY(ctx(ratio), at, 1);
        expect(row.width * ratio).toBeCloseTo(1, 9);
        // Its centre in device pixels is a half: the row it covers starts and ends on whole pixels.
        expect((row.y * ratio) % 1).toBeCloseTo(0.5, 9);
        expect(Math.abs(row.y - at) * ratio).toBeLessThanOrEqual(0.51);
      }
    }
  });

  it('keeps a wider line a whole number of device pixels wide: 2 px is 2 at 125%, 3 at 150%', () => {
    expect(crispX(ctx(1.25), 10, 2).width * 1.25).toBeCloseTo(2, 9);
    expect(crispX(ctx(1.5), 10, 2).width * 1.5).toBeCloseTo(3, 9);
    expect(crispX(ctx(1.1), 10, 10).width * 1.1).toBeCloseTo(11, 9);
  });

  it('leaves the half-pixel idiom as it is at 100% and 200%', () => {
    for (const ratio of [1, 2]) {
      for (const y of [0.5, 10.5, 99.5]) expect(crispY(ctx(ratio), y, 1)).toEqual({ y, width: 1 });
    }
  });
});

describe('hLine / vLine', () => {
  /** A context that records the path and the line width it was left with. */
  function recording(ratio: number) {
    const path: [string, number, number][] = [];
    const target = {
      lineWidth: 0,
      getTransform: () => ({ a: ratio, b: 0, c: 0, d: ratio, e: 0, f: 0 }),
      moveTo: (x: number, y: number) => { path.push(['moveTo', x, y]); },
      lineTo: (x: number, y: number) => { path.push(['lineTo', x, y]); },
    };
    return { ctx: target as unknown as CanvasRenderingContext2D, path, target };
  }

  it('adds the line the half-pixel idiom drew at 100%, 1 px wide', () => {
    const h = recording(1);
    hLine(h.ctx, 10, 200, 50.5);
    expect(h.path).toEqual([['moveTo', 10, 50.5], ['lineTo', 200, 50.5]]);
    expect(h.target.lineWidth).toBe(1);
    const v = recording(1);
    vLine(v.ctx, 70.5, 0, 300);
    expect(v.path).toEqual([['moveTo', 70.5, 0], ['lineTo', 70.5, 300]]);
  });

  it('puts the line on one row of device pixels at 125% and 150%', () => {
    for (const ratio of [1.25, 1.5]) {
      const h = recording(ratio);
      hLine(h.ctx, 0, 100, 50.5);
      expect(h.target.lineWidth * ratio).toBeCloseTo(1, 9);
      expect((h.path[0][2] * ratio) % 1).toBeCloseTo(0.5, 9);
      expect(h.path[1][2]).toBe(h.path[0][2]);
      const v = recording(ratio);
      vLine(v.ctx, 70.5, 0, 300);
      expect((v.path[0][1] * ratio) % 1).toBeCloseTo(0.5, 9);
    }
  });
});

describe('crispBox', () => {
  const ctx = (ratio: number) => ctxWithRatio(ratio);
  it('leaves a box as given at a whole ratio', () => {
    expect(crispBox(ctx(1), 10.3, 20.7, 50.5, 16)).toEqual({ x: 10.3, y: 20.7, w: 50.5, h: 16 });
    expect(crispBox(ctx(2), 10.3, 20.7, 50.5, 16)).toEqual({ x: 10.3, y: 20.7, w: 50.5, h: 16 });
  });

  it('puts all four edges on whole device pixels at 125% and 150%', () => {
    for (const ratio of [1.25, 1.5]) {
      const box = crispBox(ctx(ratio), 1421, 318, 62, 21);
      for (const edge of [box.x, box.y, box.x + box.w, box.y + box.h]) expect(Math.abs(edge * ratio - Math.round(edge * ratio))).toBeLessThan(1e-9);
      // Within half a device pixel of where it was asked for.
      expect(Math.abs(box.y - 318) * ratio).toBeLessThanOrEqual(0.51);
      expect(Math.abs(box.h - 21) * ratio).toBeLessThanOrEqual(1.01);
    }
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

describe('the same columns on the GPU', () => {
  // The shader's arithmetic in 32-bit floats: where bar `from` is, then a bar step per instance.
  const f = Math.fround;
  function gpuWickLeft(i: number, from: number, barUnit: number, offsetX: number, ratio: number, wick: number): number {
    const x0 = f(from * barUnit + offsetX);
    const cx = f(f(x0 + f(f(i - from) * f(barUnit))) * f(ratio));
    return Math.floor(f(f(cx - f(wick * 0.5)) + f(PIXEL_ROUNDING)));
  }

  it('puts every wick where Canvas 2D does, bar steps and scrolls on round numbers included', () => {
    let apart = 0;
    for (const ratio of [1, 1.25, 1.5, 2, 3]) {
      for (const barUnit of [5.1, 3.3, 7.25, 2.6, 10, 4.5]) {
        for (const scroll of [0, 1, 7, 120.5, 4321.25]) {
          const from = 4700;
          const offsetX = -(from * barUnit + scroll) + 1.55;
          const wick = barColumns(barUnit * 0.6, ratio).wick;
          const lefts = inDevicePixels(ctxWithRatio(ratio), (g) => {
            const out: number[] = [];
            for (let i = from; i < from + 400; i++) out.push(g.left(i * barUnit + offsetX, wick));
            return out;
          });
          lefts.forEach((left, k) => { if (left !== gpuWickLeft(from + k, from, barUnit, offsetX, ratio, wick)) apart++; });
        }
      }
    }
    expect(apart).toBe(0);
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
