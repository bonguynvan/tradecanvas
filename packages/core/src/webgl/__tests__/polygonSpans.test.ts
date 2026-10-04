import { describe, it, expect } from 'vitest';
import { polygonSpans, signedArea, SPAN_FLOATS } from '../polygonSpans.js';

/** The polygon's winding number at (x, y): crossings of a ray to the right. */
function winding(poly: readonly number[], x: number, y: number): number {
  let w = 0;
  const n = poly.length / 2;
  for (let i = 0; i < n; i++) {
    const x0 = poly[2 * i], y0 = poly[2 * i + 1];
    const x1 = poly[2 * ((i + 1) % n)], y1 = poly[2 * ((i + 1) % n) + 1];
    if ((y0 <= y) !== (y1 <= y)) {
      const cx = x0 + ((y - y0) * (x1 - x0)) / (y1 - y0);
      if (cx > x) w += y1 > y0 ? 1 : -1;
    }
  }
  return w;
}

/** How many spans hold (x, y): x in [x0, x1), y between the two lines there. */
function cover(spans: readonly number[], x: number, y: number): number {
  let c = 0;
  for (let k = 0; k < spans.length; k += SPAN_FLOATS) {
    const [x0, x1, a0, a1, b0, b1] = spans.slice(k, k + 6);
    if (x < x0 || x >= x1) continue;
    const t = (x - x0) / (x1 - x0);
    const ya = a0 + t * (a1 - a0);
    const yb = b0 + t * (b1 - b0);
    if (y > Math.min(ya, yb) && y < Math.max(ya, yb)) c++;
  }
  return c;
}

/** Whether the spans hold each point once exactly where the polygon is (nonzero winding), on a grid of points. */
function fillsLike(poly: number[], step = 0.371) {
  const spans = polygonSpans(poly);
  expect(spans).not.toBeNull();
  const xs = poly.filter((_, i) => i % 2 === 0);
  const ys = poly.filter((_, i) => i % 2 === 1);
  // Off the whole numbers, so no sample sits on an edge.
  for (let x = Math.min(...xs) - 0.9863; x <= Math.max(...xs) + 1; x += step) {
    for (let y = Math.min(...ys) - 0.9871; y <= Math.max(...ys) + 1; y += step) {
      expect(cover(spans!, x, y)).toBe(winding(poly, x, y) !== 0 ? 1 : 0);
    }
  }
  return spans!;
}

// A channel: an upper line left to right, then its lower line back.
function band(n: number, twist = false): number[] {
  const upper: number[] = [];
  const lower: number[] = [];
  for (let i = 0; i < n; i++) {
    const mid = 10 + 4 * Math.sin(i / 3);
    const half = twist ? 3 * Math.cos(i / 4) : 2 + (i % 3);
    upper.push(i * 2, mid - half);
    lower.push(i * 2, mid + half);
  }
  const back: number[] = [];
  for (let i = n - 1; i >= 0; i--) back.push(lower[2 * i], lower[2 * i + 1]);
  return [...upper, ...back];
}

/** The same polygon, its corners in the other order. */
function reversed(poly: readonly number[]): number[] {
  const out: number[] = [];
  for (let i = poly.length - 2; i >= 0; i -= 2) out.push(poly[i], poly[i + 1]);
  return out;
}

describe('polygonSpans', () => {
  it('fills a channel between its two lines, a span per column, marking its two ends', () => {
    const spans = fillsLike(band(40));
    expect(spans.length / SPAN_FLOATS).toBe(39);
    const ends = (k: number) => spans.slice(k * SPAN_FLOATS + 6, k * SPAN_FLOATS + 8);
    expect(ends(0)).toEqual([1, 0]);
    expect(ends(1)).toEqual([0, 0]);
    expect(ends(38)).toEqual([0, 1]);
  });

  it('fills a channel whose lines cross, both lobes', () => {
    fillsLike(band(40, true));
    fillsLike(reversed(band(40, true)));
  });

  it('fills an area down to its base, its first and last edges upright', () => {
    const line = Array.from({ length: 30 }, (_, i) => [i * 3, 20 + 8 * Math.sin(i / 2)]).flat();
    const poly = [0, 40, ...line, 87, 40];
    fillsLike(poly);
    fillsLike(reversed(poly));
  });

  it('fills a rectangle, a triangle and a circle', () => {
    fillsLike([0, 0, 10, 0, 10, 5, 0, 5]);
    fillsLike([0, 0, 10, 3, 2, 8]);
    const circle = Array.from({ length: 24 }, (_, i) => [10 + 6 * Math.cos((i / 24) * Math.PI * 2), 10 + 6 * Math.sin((i / 24) * Math.PI * 2)]).flat();
    fillsLike(circle);
  });

  it('gives null for a shape that doubles back (Canvas 2D draws it)', () => {
    // A C shape: its top and bottom run left, then right again.
    expect(polygonSpans([10, 0, 0, 0, 0, 10, 10, 10, 10, 7, 3, 7, 3, 3, 10, 3])).toBeNull();
  });

  it('gives nothing for a shape with no area', () => {
    expect(polygonSpans([0, 0, 1, 1])).toEqual([]);
    expect(polygonSpans([5, 0, 5, 3, 5, 9])).toEqual([]);
  });

  it('tells the way a polygon winds by its signed area', () => {
    expect(signedArea([0, 0, 10, 0, 10, 10, 0, 10])).toBe(100);
    expect(signedArea(reversed([0, 0, 10, 0, 10, 10, 0, 10]))).toBe(-100);
  });
});
