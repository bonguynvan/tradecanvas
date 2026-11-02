import type { DrawingStyle, Point } from '@tradecanvas/commons';
import { fillTextWithHalo } from './labels.js';
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
 * bottom to top along an upright line.
 */
export function drawLineText(ctx: CanvasRenderingContext2D, style: DrawingStyle, a: Point, b: Point): void {
  const lines = textLines(style);
  if (lines.length === 0) return;
  // The start is the left end; on an upright line, the lower one, so the text runs upward.
  const [start, end] = a.x < b.x || (a.x === b.x && a.y > b.y) ? [a, b] : [b, a];
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
  lines.forEach((line, i) => {
    const y = v === 'top'
      ? -LINE_TEXT_GAP - (lines.length - 1 - i) * lineHeight
      : v === 'bottom' ? LINE_TEXT_GAP + i * lineHeight : (i - (lines.length - 1) / 2) * lineHeight;
    fillTextWithHalo(ctx, line, inset, y);
  });
  ctx.restore();
}

/**
 * A box's text (`style.text`) inside it: on its left, its middle or its
 * right (`textAlign`), at its top, its middle or its bottom (`textVAlign`).
 */
export function drawBoxText(ctx: CanvasRenderingContext2D, style: DrawingStyle, box: Rect): void {
  const lines = textLines(style);
  if (lines.length === 0) return;
  ctx.save();
  const lineHeight = setFont(ctx, style);
  const align = style.textAlign ?? 'center';
  const x = align === 'left' ? box.x + PAD_X : align === 'right' ? box.x + box.width - PAD_X : box.x + box.width / 2;
  const v = style.textVAlign ?? 'top';
  const height = lines.length * lineHeight;
  const top = v === 'top' ? box.y + PAD_Y : v === 'bottom' ? box.y + box.height - PAD_Y - height : box.y + (box.height - height) / 2;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  lines.forEach((line, i) => fillTextWithHalo(ctx, line, x, top + i * lineHeight));
  ctx.restore();
}
