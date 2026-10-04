/**
 * Polygons the chart fills, as spans the GPU fills straight (no stencil):
 * each pixel inside lies in exactly one span, so it is painted once, as
 * Canvas 2D paints a fill.
 *
 * The chart's fills are bands and areas: two chains running left to right
 * from the polygon's leftmost corner to its rightmost (a channel's upper and
 * lower lines, a line and its base, a cloud's two spans). Filled by winding,
 * nonzero or even-odd alike, such a polygon is what lies between its chains,
 * whichever is on top. So it goes column by column: between two corners'
 * x, each chain is one straight line, and the fill is between the two lines.
 * Any other shape gives null (Canvas 2D draws it).
 */

/** Numbers per span: x0, x1, then chain a's y at x0 and x1, chain b's y at x0 and x1, then 1 if x0 is the polygon's left end, 1 if x1 is its right end. */
export const SPAN_FLOATS = 8;

/** The spans filling the closed polygon `points` (x, y pairs); null when it isn't two left-to-right chains. */
export function polygonSpans(points: readonly number[]): number[] | null {
  const n = points.length / 2;
  if (n < 3) return [];
  let left = 0;
  let right = 0;
  for (let i = 1; i < n; i++) {
    if (points[2 * i] < points[2 * left]) left = i;
    if (points[2 * i] > points[2 * right]) right = i;
  }
  // No width, no area.
  if (points[2 * left] === points[2 * right]) return [];
  const a = chain(points, left, right, 1, n);
  const b = chain(points, left, right, -1, n);
  if (!a || !b) return null;
  return between(a, b);
}

/** The signed area of the closed polygon `points`: its sign is the way it winds. */
export function signedArea(points: readonly number[]): number {
  let s = 0;
  const n = points.length / 2;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    s += points[2 * i] * points[2 * j + 1] - points[2 * j] * points[2 * i + 1];
  }
  return s / 2;
}

/** The corners from `from` to `to` stepping by `step`, as x, y pairs; null if x ever goes back. */
function chain(p: readonly number[], from: number, to: number, step: 1 | -1, n: number): number[] | null {
  const out = [p[2 * from], p[2 * from + 1]];
  for (let k = from; k !== to; ) {
    k = (k + step + n) % n;
    if (p[2 * k] < out[out.length - 2]) return null;
    out.push(p[2 * k], p[2 * k + 1]);
  }
  return out;
}

/** A chain's y over [x0, x1] (inside one of its sloping segments): at x0 and at x1. */
class Walker {
  private i = 0;
  constructor(private readonly c: readonly number[]) {}

  at(x0: number, x1: number): [number, number] {
    const c = this.c;
    // Past segments that end before x1, and upright ones (no width).
    while (this.i + 5 < c.length && (c[this.i + 2] < x1 || c[this.i + 2] === c[this.i])) this.i += 2;
    const ax = c[this.i], ay = c[this.i + 1], bx = c[this.i + 2], by = c[this.i + 3];
    const y = (x: number) => (bx === ax ? ay : ay + ((by - ay) * (x - ax)) / (bx - ax));
    return [y(x0), y(x1)];
  }
}

function between(a: readonly number[], b: readonly number[]): number[] {
  const xs = new Set<number>();
  for (let k = 0; k < a.length; k += 2) xs.add(a[k]);
  for (let k = 0; k < b.length; k += 2) xs.add(b[k]);
  const sorted = [...xs].sort((u, v) => u - v);
  const wa = new Walker(a);
  const wb = new Walker(b);
  const out: number[] = [];
  const last = sorted.length - 2;
  for (let k = 0; k <= last; k++) {
    const x0 = sorted[k];
    const x1 = sorted[k + 1];
    const [a0, a1] = wa.at(x0, x1);
    const [b0, b1] = wb.at(x0, x1);
    // Where the chains meet all along, nothing.
    if (a0 === b0 && a1 === b1) continue;
    out.push(x0, x1, a0, a1, b0, b1, k === 0 ? 1 : 0, k === last ? 1 : 0);
  }
  return out;
}
