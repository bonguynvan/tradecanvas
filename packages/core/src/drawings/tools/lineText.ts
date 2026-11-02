import type { DrawingStyle, Point } from '@tradecanvas/commons';
import { fillTextWithHalo, takeLabelBox } from './labels.js';
import { boxFont, PAD_X, PAD_Y, type Rect } from './textBox.js';

/** The size a line's or a box's text is written at without one of its own (px). */
const LINE_TEXT_SIZE = 13;
/** How far the text sits off its line, above or under it (px). */
const LINE_TEXT_GAP = 4;
/** How far in from an end of the line the text starts (px). */
const LINE_TEXT_INSET = 6;
/** The text's line height, as a multiple of its size. */
const LINE_HEIGHT = 1.3;
/** Most lines a line's or a box's text shows. */
const MAX_LINES = 20;
/** A line closer than this to upright (px across) reads as upright: its text runs upward either way. */
const UPRIGHT_PX = 0.5;
/** A slope this close to flat (radians) takes room from the price labels drawn after it. */
const FLAT = 1e-6;

/**
 * The part of the segment from `a` to `b` inside `rect`, or null when none
 * of it is (Liang–Barsky): where a line's text can be read.
 */
export function clipSegment(a: Point, b: Point, rect: Rect): [Point, Point] | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  let t0 = 0;
  let t1 = 1;
  const edges: [number, number][] = [
    [-dx, a.x - rect.x], [dx, rect.x + rect.width - a.x],
    [-dy, a.y - rect.y], [dy, rect.y + rect.height - a.y],
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return null;
      continue;
    }
    const r = q / p;
    if (p < 0) t0 = Math.max(t0, r);
    else t1 = Math.min(t1, r);
    if (t0 > t1) return null;
  }
  return [{ x: a.x + t0 * dx, y: a.y + t0 * dy }, { x: a.x + t1 * dx, y: a.y + t1 * dy }];
}

/**
 * Where a line's or a box's text was drawn: `width` × `height` from
 * (`left`, `top`) in a frame turned `angle` about (`x`, `y`). A box's
 * text is not turned.
 */
export interface TextHitBox {
  x: number;
  y: number;
  angle: number;
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Most drawings' text boxes kept; past it the cache starts again (a host that makes thousands). */
const MAX_TEXT_BOXES = 2000;

/** Each drawing's text box as last drawn, by id: a click on the words picks the drawing. */
export class TextHitCache {
  private boxes = new Map<string, TextHitBox>();

  set(id: string, box: TextHitBox | null): void {
    if (!box) {
      this.boxes.delete(id);
      return;
    }
    if (this.boxes.size >= MAX_TEXT_BOXES && !this.boxes.has(id)) this.boxes.clear();
    this.boxes.set(id, box);
  }

  /** The upright box round the drawing's words, as drawn (turned with a sloping line); null without words. */
  bounds(id: string): Rect | null {
    const box = this.boxes.get(id);
    if (!box) return null;
    const cos = Math.cos(box.angle);
    const sin = Math.sin(box.angle);
    const corners = [[box.left, box.top], [box.left + box.width, box.top], [box.left, box.top + box.height], [box.left + box.width, box.top + box.height]]
      .map(([u, v]) => ({ x: box.x + u * cos - v * sin, y: box.y + u * sin + v * cos }));
    const xs = corners.map((c) => c.x);
    const ys = corners.map((c) => c.y);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
  }

  /** Whether `point` is on the drawing's words, within `tolerance` px. */
  hit(id: string, point: Point, tolerance: number): boolean {
    const box = this.boxes.get(id);
    if (!box) return false;
    // Into the words' own frame: along the line and square to it.
    const dx = point.x - box.x;
    const dy = point.y - box.y;
    const cos = Math.cos(box.angle);
    const sin = Math.sin(box.angle);
    const along = dx * cos + dy * sin;
    const across = -dx * sin + dy * cos;
    return along >= box.left - tolerance && along <= box.left + box.width + tolerance
      && across >= box.top - tolerance && across <= box.top + box.height + tolerance;
  }
}

/** The text's lines, or none without a text. */
function textLines(style: DrawingStyle): string[] {
  const text = style.text?.trim();
  return text ? text.split('\n').slice(0, MAX_LINES) : [];
}

function setFont(ctx: CanvasRenderingContext2D, style: DrawingStyle): number {
  const size = style.fontSize || LINE_TEXT_SIZE;
  ctx.font = boxFont(size, style.bold, style.italic);
  ctx.fillStyle = style.textColor ?? style.color;
  return size * LINE_HEIGHT;
}

/**
 * A line's text (`style.text`) along the line from `a` to `b`: at its left
 * end, its middle or its right end (`textAlign`), above it, on it or under
 * it (`textVAlign`), turned to its slope. It always reads left to right, and
 * bottom to top along an upright line. With `plot`, only the part of the
 * line on it counts, so the text stays in sight as the line runs off.
 */
export function drawLineText(ctx: CanvasRenderingContext2D, style: DrawingStyle, a: Point, b: Point, plot?: Rect): TextHitBox | null {
  const lines = textLines(style);
  if (lines.length === 0) return null;
  const seen = plot ? clipSegment(a, b, plot) : [a, b] as [Point, Point];
  if (!seen) return null;
  const [p, q] = seen;
  // The start is the left end; on an upright line, or one a hair off it, the lower one, so the text runs upward.
  const upright = Math.abs(q.x - p.x) < UPRIGHT_PX;
  const [start, end] = upright ? (p.y > q.y ? [p, q] : [q, p]) : p.x < q.x ? [p, q] : [q, p];
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const align = style.textAlign ?? 'center';
  const at = align === 'left' ? start : align === 'right' ? end : { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const inset = align === 'left' ? LINE_TEXT_INSET : align === 'right' ? -LINE_TEXT_INSET : 0;
  ctx.save();
  const lineHeight = setFont(ctx, style);
  ctx.translate(at.x, at.y);
  ctx.rotate(angle);
  ctx.textAlign = align;
  const v = style.textVAlign ?? 'top';
  ctx.textBaseline = v === 'top' ? 'bottom' : v === 'bottom' ? 'top' : 'middle';
  let widest = 0;
  lines.forEach((line, i) => {
    widest = Math.max(widest, ctx.measureText(line).width);
    const y = v === 'top'
      ? -LINE_TEXT_GAP - (lines.length - 1 - i) * lineHeight
      : v === 'bottom' ? LINE_TEXT_GAP + i * lineHeight : (i - (lines.length - 1) / 2) * lineHeight;
    fillTextWithHalo(ctx, line, inset, y);
    // On a flat line, the labels drawn after it (a level's price) keep clear of it.
    if (Math.abs(angle) < FLAT) {
      const width = ctx.measureText(line).width;
      const left = at.x + inset - (align === 'left' ? 0 : align === 'right' ? width : width / 2);
      const top = at.y + y - (v === 'top' ? lineHeight : v === 'bottom' ? 0 : lineHeight / 2);
      takeLabelBox(left, top, left + width, top + lineHeight);
    }
  });
  ctx.restore();
  const height = lines.length * lineHeight;
  return {
    x: at.x,
    y: at.y,
    angle,
    left: inset - (align === 'left' ? 0 : align === 'right' ? widest : widest / 2),
    top: v === 'top' ? -LINE_TEXT_GAP - height : v === 'bottom' ? LINE_TEXT_GAP : -height / 2,
    width: widest,
    height,
  };
}

/**
 * A box's text (`style.text`) inside it: on its left, its middle or its
 * right (`textAlign`), at its top, its middle or its bottom (`textVAlign`).
 */
export function drawBoxText(ctx: CanvasRenderingContext2D, style: DrawingStyle, box: Rect): TextHitBox | null {
  const lines = textLines(style);
  if (lines.length === 0) return null;
  ctx.save();
  const lineHeight = setFont(ctx, style);
  const align = style.textAlign ?? 'center';
  const x = align === 'left' ? box.x + PAD_X : align === 'right' ? box.x + box.width - PAD_X : box.x + box.width / 2;
  const v = style.textVAlign ?? 'top';
  const height = lines.length * lineHeight;
  const top = v === 'top' ? box.y + PAD_Y : v === 'bottom' ? box.y + box.height - PAD_Y - height : box.y + (box.height - height) / 2;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  let widest = 0;
  lines.forEach((line, i) => {
    widest = Math.max(widest, ctx.measureText(line).width);
    fillTextWithHalo(ctx, line, x, top + i * lineHeight);
  });
  ctx.restore();
  const left = align === 'left' ? x : align === 'right' ? x - widest : x - widest / 2;
  return { x: 0, y: 0, angle: 0, left, top, width: widest, height };
}
