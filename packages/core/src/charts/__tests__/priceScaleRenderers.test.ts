import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OHLCBar, ViewportState } from '@tradecanvas/commons';
import { DARK_THEME } from '@tradecanvas/commons';
import { CandlestickRenderer } from '../CandlestickRenderer.js';
import { LineRenderer } from '../LineRenderer.js';
import { priceToY } from '../../viewport/ScaleMapping.js';

/** Records rects and line points from Path2D and the context. */
let rects: number[][];
let points: number[][];

class RecordingPath {
  rect(x: number, y: number, w: number, h: number) { rects.push([x, y, w, h]); }
  moveTo(x: number, y: number) { points.push([x, y]); }
  lineTo(x: number, y: number) { points.push([x, y]); }
}

const ctx = new Proxy({}, {
  get: (_t, prop) => {
    if (prop === 'moveTo' || prop === 'lineTo') return (x: number, y: number) => points.push([x, y]);
    return () => {};
  },
  set: () => true,
}) as unknown as CanvasRenderingContext2D;

const bars: OHLCBar[] = [
  { time: 0, open: 120, high: 180, low: 110, close: 170, volume: 1 }, // up
  { time: 1, open: 170, high: 175, low: 105, close: 115, volume: 1 }, // down
];

const base = {
  visibleRange: { from: 0, to: 1 }, priceRange: { min: 100, max: 200 },
  barWidth: 8, barSpacing: 2, offset: 0, chartRect: { x: 0, y: 0, width: 400, height: 300 },
} as ViewportState;

beforeEach(() => {
  rects = [];
  points = [];
  vi.stubGlobal('Path2D', RecordingPath);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe.each([
  ['linear', base],
  ['inverted', { ...base, invertScale: true }],
  ['log', { ...base, logScale: true }],
  ['log inverted', { ...base, logScale: true, invertScale: true }],
] as [string, ViewportState][])('price scale: %s', (_name, vp) => {
  it('draws candle bodies between open and close, where overlays put those prices', () => {
    new CandlestickRenderer().render(ctx, bars, vp, DARK_THEME);
    expect(rects).toHaveLength(2);
    rects.forEach(([, top, , height], i) => {
      const a = priceToY(bars[i].open, vp);
      const b = priceToY(bars[i].close, vp);
      expect(top).toBeCloseTo(Math.min(a, b), 9);
      expect(height).toBeCloseTo(Math.abs(a - b), 9);
    });
  });

  it('draws the line through the closes where overlays put them', () => {
    new LineRenderer().render(ctx, bars, vp, DARK_THEME);
    expect(points).toHaveLength(bars.length);
    points.forEach(([, y], i) => expect(y).toBeCloseTo(priceToY(bars[i].close, vp), 9));
  });
});
