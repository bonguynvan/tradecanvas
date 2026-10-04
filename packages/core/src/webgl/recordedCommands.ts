import type { RGBA } from './glColor.js';

/** A clip or bounds in device pixels. */
export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export type GpuPaint =
  /** Premultiplied, global alpha applied. */
  | { kind: 'solid'; color: RGBA }
  /**
   * Along (x0, y0) → (x1, y1) in device pixels. Stop colours are kept
   * unpremultiplied (global alpha applied to their alpha): Canvas 2D blends
   * between them so, and premultiplies after.
   */
  | { kind: 'linear'; x0: number; y0: number; x1: number; y1: number; stops: { offset: number; color: RGBA }[] };

export type GpuCommand =
  /** Axis-aligned rectangles, already clipped: left, top, right, bottom, then a premultiplied colour (8 numbers each). */
  | { type: 'rects'; values: number[] }
  /**
   * Polylines: x, y, w, cum per point (w 1 drawn, 0 a neighbour only, -1 a
   * break; cum the length along the line so far, for dashes), with two
   * points before the first segment and two after the last.
   */
  | { type: 'stroke'; points: number[]; color: RGBA; width: number; cap: 0 | 1 | 2; dash: number[] | null; clip: Box }
  /** Polygons as spans (see polygonSpans.ts), each pixel inside in one of them. */
  | { type: 'fill'; spans: number[]; bounds: Box; paint: GpuPaint; clip: Box }
  /** Discs: x, y, radius, then a premultiplied colour (7 numbers each). */
  | { type: 'circles'; values: number[]; clip: Box };

export const intersect = (a: Box, b: Box): Box => ({ x0: Math.max(a.x0, b.x0), y0: Math.max(a.y0, b.y0), x1: Math.min(a.x1, b.x1), y1: Math.min(a.y1, b.y1) });

export const isEmpty = (b: Box): boolean => !(b.x1 > b.x0 && b.y1 > b.y0);

/** The box around x, y pairs, grown by `pad` each side. */
export function boundsOf(points: readonly number[], pad = 0): Box {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < points.length; i += 2) {
    const x = points[i];
    const y = points[i + 1];
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  return { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad };
}

/**
 * Whether any two boxes overlap over some area (touching doesn't count).
 * Canvas 2D paints the union of a path's pieces once; drawn one by one,
 * see-through or antialiased pieces that overlap would paint some pixels twice.
 */
export function anyOverlap(boxes: readonly Box[]): boolean {
  const sorted = [...boxes].sort((a, b) => a.x0 - b.x0);
  const open: Box[] = [];
  for (const b of sorted) {
    for (let i = open.length - 1; i >= 0; i--) if (open[i].x1 <= b.x0) open.splice(i, 1);
    for (const a of open) if (a.y0 < b.y1 && b.y0 < a.y1) return true;
    open.push(b);
  }
  return false;
}
