/**
 * Strokes as the GPU draws them: round where segments join. Canvas 2D joins
 * by `lineJoin` (miter by default); the two differ only at the outside of a
 * turn, and only by a sliver until the turn gets sharp.
 */

/** A line to stroke: x, y pairs in device pixels. */
export interface Polyline {
  points: number[];
  closed: boolean;
}

/** How far a join may differ from a round one and still pass for it, in device pixels. */
const JOIN_TOLERANCE = 0.25;

/**
 * Whether a join of `line` turns sharply enough that a `join` join of half
 * width `hw` would visibly differ from a round one. A miter reaches
 * hw / cos(θ/2) out at a turn of θ (bevelled past `miterLimit`), a bevel
 * stops at hw·cos(θ/2); a round join reaches hw.
 */
export function hasSharpJoin(line: Polyline, hw: number, join: CanvasLineJoin, miterLimit: number): boolean {
  if (join === 'round') return false;
  const p = line.points;
  const n = p.length / 2;
  const first = line.closed ? 0 : 1;
  const last = line.closed ? n : n - 1;
  for (let i = first; i < last; i++) {
    const prev = (i - 1 + n) % n;
    const next = (i + 1) % n;
    const ax = p[2 * i] - p[2 * prev], ay = p[2 * i + 1] - p[2 * prev + 1];
    const bx = p[2 * next] - p[2 * i], by = p[2 * next + 1] - p[2 * i + 1];
    const la = Math.hypot(ax, ay);
    const lb = Math.hypot(bx, by);
    if (la === 0 || lb === 0) continue;
    // cos θ of the turn, then cos θ/2.
    const cos = Math.max(-1, Math.min(1, (ax * bx + ay * by) / (la * lb)));
    const half = Math.sqrt((1 + cos) / 2);
    const mitered = join === 'miter' && half > 0 && 1 / half <= miterLimit;
    const off = mitered ? hw * (1 / half - 1) : hw * (1 - half);
    if (off > JOIN_TOLERANCE) return true;
  }
  return false;
}

/** Whether some segment of `line` is shorter than `length`. */
export function hasShortSegment(line: Polyline, length: number): boolean {
  const p = line.points;
  for (let i = 2; i < p.length; i += 2) {
    if (Math.hypot(p[i] - p[i - 2], p[i + 1] - p[i - 1]) < length) return true;
  }
  return false;
}

/**
 * The lines packed for the stroke shader: x, y, w, cum per point, where w is
 * 1 for a point of the line, 0 for a neighbour only (a closed line's corners
 * repeated around its seam), -1 for a break; cum is the length along the
 * line so far. Two points come before the first segment and two after the
 * last, so each segment sees two neighbours either side.
 */
export function packStroke(lines: readonly Polyline[]): number[] {
  const out: number[] = [];
  const sep = () => out.push(0, 0, -1, 0);
  sep();
  sep();
  for (const { points: p, closed: shut } of lines) {
    const n = p.length / 2;
    const closed = shut && n >= 3;
    if (closed) {
      // Neighbours of the first segment: the last two corners.
      out.push(p[2 * (n - 2)], p[2 * (n - 2) + 1], 0, 0, p[2 * (n - 1)], p[2 * (n - 1) + 1], 0, 0);
    }
    let cum = 0;
    for (let i = 0; i < n; i++) {
      if (i > 0) cum += Math.hypot(p[2 * i] - p[2 * i - 2], p[2 * i + 1] - p[2 * i - 1]);
      out.push(p[2 * i], p[2 * i + 1], 1, cum);
    }
    if (closed) {
      cum += Math.hypot(p[0] - p[2 * (n - 1)], p[1] - p[2 * (n - 1) + 1]);
      out.push(p[0], p[1], 1, cum);
      // Neighbours of the closing segment: the first two after the start.
      out.push(p[2], p[3], 0, 0, p[4], p[5], 0, 0);
    }
    sep();
  }
  sep();
  return out;
}
