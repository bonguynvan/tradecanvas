import { describe, it, expect } from 'vitest';
import type { ViewportState } from '@tradecanvas/commons';
import { priceToYMapper } from '../../viewport/ScaleMapping.js';
import { mappedY, yMapping } from '../yMapping.js';

const viewport = (over: Partial<ViewportState> = {}): ViewportState => ({
  chartRect: { x: 0, y: 12, width: 800, height: 600 },
  priceRange: { min: 29_000, max: 31_000 },
  barWidth: 8,
  barSpacing: 2,
  offset: 0,
  visibleRange: { from: 0, to: 79 },
  ...over,
} as ViewportState);

/** Prices around the range, a quarter of it past either end (zero too, on a linear scale). */
function pricesFor(vp: ViewportState): number[] {
  const { min, max } = vp.priceRange;
  const span = Math.max(max - min, Math.abs(max) * 0.01);
  const out = [min - span / 4, min, (min + max) / 2, max, max + span / 4].filter((p) => !vp.logScale || p > 0);
  return vp.logScale ? out : [0, ...out];
}

describe('yMapping matches priceToYMapper', () => {
  const cases: [string, Partial<ViewportState>][] = [
    ['linear', {}],
    ['linear, inverted', { invertScale: true }],
    ['log', { logScale: true }],
    ['log, inverted', { logScale: true, invertScale: true }],
    ['log, tiny prices', { logScale: true, priceRange: { min: 1e-7, max: 3e-6 } }],
    ['flat range', { priceRange: { min: 30_000, max: 30_000 } }],
    ['flat log range', { logScale: true, priceRange: { min: 30_000, max: 30_000 } }],
    ['log with a non-positive range falls back to linear', { logScale: true, priceRange: { min: -5, max: 10 } }],
  ];
  for (const [name, over] of cases) {
    it(name, () => {
      const vp = viewport(over);
      const toY = priceToYMapper(vp);
      const { min, max } = vp.priceRange;
      const base = min + (max - min) * 0.6;
      const m = yMapping(vp, base);
      for (const price of pricesFor(vp)) expect(mappedY(m, price - base)).toBeCloseTo(toY(price), 6);
    });
  }
});

describe('yMapping on a log scale at zero', () => {
  it('floors a zero price as priceToYMapper does', () => {
    const vp = viewport({ logScale: true, priceRange: { min: 1, max: 100 } });
    const m = yMapping(vp, 50);
    expect(mappedY(m, -50)).toBeCloseTo(priceToYMapper(vp)(0), 6);
  });
});

describe('yMapping in float32', () => {
  // The shaders work in float32: each step rounded as the GPU rounds it.
  const f32 = Math.fround;

  it('stays within a twentieth of a pixel on a narrow log range at a high price', () => {
    const vp = viewport({ logScale: true, priceRange: { min: 84_700, max: 85_100 }, chartRect: { x: 0, y: 0, width: 800, height: 1400 } });
    const base = 84_900.5;
    const toY = priceToYMapper(vp);
    const m = yMapping(vp, base);
    // Uniforms reach the GPU as float32 too.
    const gpu = { ...m, logOffset: f32(m.logOffset), min: f32(m.min), logFloor: f32(m.logFloor), logK: f32(m.logK), top: f32(m.top), bottom: f32(m.bottom) };
    for (let price = 84_700; price <= 85_100; price += 13.7) {
      expect(Math.abs(mappedY(gpu, f32(price - base), f32) - toY(price))).toBeLessThan(0.05);
    }
  });

  it('stays within a twentieth of a pixel on a linear range at a high price', () => {
    const vp = viewport({ priceRange: { min: 84_700, max: 85_100 }, chartRect: { x: 0, y: 0, width: 800, height: 1400 } });
    const base = 84_900.5;
    const toY = priceToYMapper(vp);
    const m = yMapping(vp, base);
    const gpu = { ...m, yA: f32(m.yA), yB: f32(m.yB) };
    for (let price = 84_700; price <= 85_100; price += 13.7) {
      expect(Math.abs(mappedY(gpu, f32(price - base), f32) - toY(price))).toBeLessThan(0.05);
    }
  });
});
