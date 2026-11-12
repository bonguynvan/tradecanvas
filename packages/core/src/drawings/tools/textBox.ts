import type { DrawingStyle } from '@tradecanvas/commons';
import { drawingFill, drawingLook, extendExtent, hasOwnFill, labelInk, readableText, textSize } from '../drawingLook.js';
import { fillTextWithHalo } from './labels.js';

/** A box of wrapped text on the chart (a note, a callout), and its size. */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextBoxLook {
  fontSize: number;
  /** Text colour. */
  color: string;
  /** Box fill; none when left out. */
  fill?: string;
  /** Box border; none when left out. */
  stroke?: string;
  /** Widest a line gets before it wraps (px); `Infinity`: only where the text breaks. */
  maxWidth: number;
  bold?: boolean;
  italic?: boolean;
  /** Where each line lines up in the box. */
  align?: 'left' | 'center' | 'right';
  /** Most lines drawn (12 when left out): a note keeps short, a text says what it has to. */
  maxLines?: number;
  /** The box's corners, px (3 when left out). */
  radius?: number;
  /**
   * Traces the box's outline (on whole pixels) in place of a rounded box, for a
   * box with more to its shape (a balloon's tail): filled and outlined as one.
   */
  traceBox?: (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => void;
}

/**
 * The look of a drawing's text from its style (`DrawingStyle`'s text
 * fields), over the tool's own defaults: `box` and `border` say whether
 * the tool draws them unless the style says, `width` where it wraps.
 */
export function textLook(
  style: DrawingStyle,
  defaults: { box: boolean; border: boolean; width: number; fill?: boolean; solid?: boolean },
): TextBoxLook {
  const box = style.textBackground ?? defaults.box;
  const border = style.textBorder ?? defaults.border;
  // A bubble (`solid`) is filled with its colour itself: tinted, the bars under it show through its words.
  const bubble = defaults.solid === true && box && !hasOwnFill(style);
  // A fill set by hand as kept, its alpha included; else the line's colour, tinted, where the tool fills.
  const fill = !defaults.fill && !style.fillColor ? undefined : drawingFill(style, bubble ? BUBBLE_ALPHA : undefined);
  return {
    fontSize: textSize(style),
    // On a bubble, the ink that reads on its colour. Else the line's colour, deepened where it would not read on the chart (a light background).
    color: style.textColor ?? (bubble ? labelInk(style.color) : readableText(style.color)),
    fill: box && fill ? fill : undefined,
    stroke: border ? style.borderColor ?? style.color : undefined,
    maxWidth: style.textWrap === undefined ? defaults.width : style.textWrap > 0 ? style.textWrap : Infinity,
    bold: style.bold,
    italic: style.italic,
    align: style.textAlign,
  };
}


/** How solid a bubble's fill is: its words read over candles, a hint of the chart still shows. */
const BUBBLE_ALPHA = 0.9;
/** A bubble's corners, px: rounder than a plain box's, so it reads as a speech bubble. */
export const BUBBLE_RADIUS = 6;
/** Half a bubble's tail where it leaves the bubble, px. */
export const TAIL_HALF = 8;

/** Where a bubble's tail leaves it: its two feet on one side, in the order a clockwise outline meets them. */
export interface TailFeet {
  side: 'top' | 'right' | 'bottom' | 'left';
  first: { x: number; y: number };
  second: { x: number; y: number };
}

/**
 * The feet of the tail from `box` (corners `r` round) to `tip`: on the side
 * facing `tip`, `half` px each way from a foot as near `tip` as the round
 * corners allow. Null with `tip` inside the box: no tail. What is drawn and
 * what a press hits both read it, so they agree.
 */
export function tailFeet(box: Rect, tip: { x: number; y: number }, half: number, r: number): TailFeet | null {
  const right = box.x + box.width;
  const bottom = box.y + box.height;
  if (tip.x >= box.x && tip.x <= right && tip.y >= box.y && tip.y <= bottom) return null;
  const dx = tip.x - (box.x + box.width / 2);
  const dy = tip.y - (box.y + box.height / 2);
  /** The tail's foot along a side from `from` to `to`, as near `at` as the corners allow. */
  const foot = (from: number, to: number, at: number): number => {
    const first = from + r + half;
    const last = to - r - half;
    return first <= last ? Math.max(first, Math.min(at, last)) : (from + to) / 2;
  };
  // The box's own proportions decide the side, so a wide bubble points sideways only at a point well to its side.
  if (Math.abs(dx) * box.height > Math.abs(dy) * box.width) {
    const mid = foot(box.y, bottom, tip.y);
    return dx > 0
      ? { side: 'right', first: { x: right, y: mid - half }, second: { x: right, y: mid + half } }
      : { side: 'left', first: { x: box.x, y: mid + half }, second: { x: box.x, y: mid - half } };
  }
  const mid = foot(box.x, right, tip.x);
  return dy > 0
    ? { side: 'bottom', first: { x: mid + half, y: bottom }, second: { x: mid - half, y: bottom } }
    : { side: 'top', first: { x: mid - half, y: box.y }, second: { x: mid + half, y: box.y } };
}

/**
 * A bubble's outline with a tail to `tip` in it (`tailFeet`), one path round
 * both, clockwise from the top-left corner: filled and outlined at once, no
 * seam where the tail leaves.
 */
export function tailedBox(tip: { x: number; y: number }, half: number): NonNullable<TextBoxLook['traceBox']> {
  return (ctx, x, y, w, h, r) => {
    const right = x + w;
    const bottom = y + h;
    const feet = tailFeet({ x, y, width: w, height: h }, tip, half, r);
    const tail = (side: TailFeet['side']) => {
      if (feet?.side !== side) return;
      ctx.lineTo(feet.first.x, feet.first.y);
      ctx.lineTo(tip.x, tip.y);
      ctx.lineTo(feet.second.x, feet.second.y);
    };
    ctx.moveTo(x + r, y);
    tail('top');
    ctx.arcTo(right, y, right, bottom, r);
    tail('right');
    ctx.arcTo(right, bottom, x, bottom, r);
    tail('bottom');
    ctx.arcTo(x, bottom, x, y, r);
    tail('left');
    ctx.arcTo(x, y, right, y, r);
    ctx.closePath();
  };
}

/** Whether `p` is in the triangle `a`, `b`, `c` (a tail), or within `tolerance` px of it. */
export function inTriangle(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }, tolerance = 0): boolean {
  const cross = (o: { x: number; y: number }, q: { x: number; y: number }) => (q.x - o.x) * (p.y - o.y) - (q.y - o.y) * (p.x - o.x);
  const d1 = cross(a, b);
  const d2 = cross(b, c);
  const d3 = cross(c, a);
  if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) return true;
  // Outside: still a hit close to the tail's middle line, where a thin tail is hard to press.
  const mid = { x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 };
  const len = Math.hypot(b.x - mid.x, b.y - mid.y) || 1;
  const t = Math.max(0, Math.min(1, ((p.x - mid.x) * (b.x - mid.x) + (p.y - mid.y) * (b.y - mid.y)) / (len * len)));
  return Math.hypot(p.x - (mid.x + t * (b.x - mid.x)), p.y - (mid.y + t * (b.y - mid.y))) <= tolerance;
}

export const PAD_X = 8;
export const PAD_Y = 6;
const LINE_GAP = 1.3;
/** Most lines shown; the rest is cut with an ellipsis. */
const MAX_LINES = 12;


/** A text box's corners, px. */
const BOX_RADIUS = 3;

/** The font of text people write: the prose face, or the figures face for a price (`prose` false). */
export function boxFont(fontSize: number, bold = false, italic = false, prose = true): string {
  const look = drawingLook();
  return `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${fontSize}px ${prose ? look.prose : look.figures}`;
}

/**
 * `text` in lines no wider than `maxWidth`: its own line breaks kept, words
 * wrapped, a word longer than a line cut. At most `MAX_LINES` lines.
 */
export function wrapText(measure: (text: string) => number, text: string, maxWidth: number, maxLines = MAX_LINES): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (measure(next) <= maxWidth) {
        line = next;
        continue;
      }
      if (line) lines.push(line);
      line = measure(word) <= maxWidth ? word : cutToWidth(measure, word, maxWidth);
    }
    lines.push(line);
    if (lines.length >= maxLines) break;
  }
  if (lines.length > maxLines) lines.length = maxLines;
  return lines;
}

/** The longest start of `word` that fits with an ellipsis (found by halving, not letter by letter). */
function cutToWidth(measure: (text: string) => number, word: string, maxWidth: number): string {
  if (measure(word) <= maxWidth) return word;
  let lo = 1;
  let hi = word.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (measure(`${word.slice(0, mid)}…`) <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return `${word.slice(0, lo)}…`;
}

/** Most wrapped texts remembered; text is drawn every frame but rarely changes. */
const MAX_WRAPPED = 200;
const wrapped = new Map<string, string[]>();

/** `wrapText`, remembered by text, font and width. */
function wrapCached(measure: (text: string) => number, text: string, maxWidth: number, font: string, maxLines: number): string[] {
  const key = `${font}|${maxWidth}|${maxLines}|${text}`;
  const hit = wrapped.get(key);
  if (hit) return hit;
  if (wrapped.size >= MAX_WRAPPED) wrapped.clear();
  const lines = wrapText(measure, text, maxWidth, maxLines);
  wrapped.set(key, lines);
  return lines;
}

/** The box `lines` take at `look.fontSize`, its top-left at (x, y). */
export function textBoxRect(measure: (text: string) => number, lines: readonly string[], x: number, y: number, fontSize: number): Rect {
  const width = Math.max(0, ...lines.map(measure)) + PAD_X * 2;
  const height = lines.length * fontSize * LINE_GAP + PAD_Y * 2;
  return { x, y, width, height };
}

/** The size the box of `text` takes under `look`, before it is drawn (to place it by its middle or foot). */
export function measureTextBox(ctx: CanvasRenderingContext2D, text: string, look: TextBoxLook): { width: number; height: number } {
  const font = boxFont(look.fontSize, look.bold, look.italic);
  ctx.font = font;
  const measure = (t: string) => ctx.measureText(t).width;
  const { width, height } = textBoxRect(measure, wrapCached(measure, text, look.maxWidth, font, look.maxLines ?? MAX_LINES), 0, 0, look.fontSize);
  return { width, height };
}

/** Draw wrapped text in a box with its top-left at (x, y). Returns the box. */
export function drawTextBox(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, look: TextBoxLook): Rect {
  const font = boxFont(look.fontSize, look.bold, look.italic);
  ctx.font = font;
  const measure = (t: string) => ctx.measureText(t).width;
  const lines = wrapCached(measure, text, look.maxWidth, font, look.maxLines ?? MAX_LINES);
  const rect = textBoxRect(measure, lines, x, y, look.fontSize);
  if (look.fill || look.stroke) {
    // On whole pixels: the box's edges sharp, a 1 px border one row.
    const bx = Math.round(rect.x) + 0.5;
    const by = Math.round(rect.y) + 0.5;
    const radius = look.radius ?? BOX_RADIUS;
    ctx.beginPath();
    if (look.traceBox) look.traceBox(ctx, bx, by, Math.round(rect.width) - 1, Math.round(rect.height) - 1, radius);
    else if (typeof ctx.roundRect === 'function') ctx.roundRect(bx, by, Math.round(rect.width) - 1, Math.round(rect.height) - 1, radius);
    else ctx.rect(bx, by, Math.round(rect.width) - 1, Math.round(rect.height) - 1);
    if (look.fill) {
      ctx.fillStyle = look.fill;
      ctx.fill();
    }
    if (look.stroke) {
      ctx.strokeStyle = look.stroke;
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.stroke();
    }
  }
  ctx.fillStyle = look.color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const inner = rect.width - PAD_X * 2;
  lines.forEach((line, i) => {
    const room = inner - measure(line);
    const shift = look.align === 'center' ? room / 2 : look.align === 'right' ? room : 0;
    const ty = y + PAD_Y + i * look.fontSize * LINE_GAP;
    // Without a box, a halo of the chart's background keeps the text off the bars.
    if (look.fill) ctx.fillText(line, x + PAD_X + shift, ty);
    else fillTextWithHalo(ctx, line, x + PAD_X + shift, ty);
  });
  return rect;
}

/** How far a selection frame sits outside what it frames, px: clear of a box's own border. */
const FRAME_GAP = 3;

/**
 * A selected one-point drawing's frame (a text, a mark): 1 px, solid, rounded
 * and on whole pixels, in `color`, `FRAME_GAP` outside `rect`. These drawings
 * show it in place of a handle, which would sit on their letters or glyph.
 * Its room is noted as covered whether or not it is drawn: a toolbar placed as
 * the drawing is picked, before the frame shows, keeps clear of it.
 */
export function strokeSelectionFrame(ctx: CanvasRenderingContext2D, rect: Rect, color: string, selected = true): void {
  const left = Math.round(rect.x - FRAME_GAP) + 0.5;
  const top = Math.round(rect.y - FRAME_GAP) + 0.5;
  const width = Math.round(rect.width + FRAME_GAP * 2) - 1;
  const height = Math.round(rect.height + FRAME_GAP * 2) - 1;
  extendExtent(left - 1, top - 1, width + 2, height + 2);
  if (!selected) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 1;
  ctx.setLineDash([]);
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(left, top, width, height, BOX_RADIUS + FRAME_GAP);
  else ctx.rect(left, top, width, height);
  ctx.stroke();
  ctx.restore();
}

/** The box round `points` (a glyph's outline). */
export function boundsOf(points: readonly { x: number; y: number }[]): Rect {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

export function inRect(point: { x: number; y: number }, rect: Rect, tolerance = 0): boolean {
  return point.x >= rect.x - tolerance && point.x <= rect.x + rect.width + tolerance
    && point.y >= rect.y - tolerance && point.y <= rect.y + rect.height + tolerance;
}

/** Most boxes remembered; past it the cache starts over (drawings redraw every frame). */
const MAX_BOXES = 1000;

/** Where each drawing's box was last drawn, for hit-testing without a canvas. */
export class BoxCache {
  private boxes = new Map<string, Rect>();

  set(id: string, rect: Rect): void {
    if (this.boxes.size >= MAX_BOXES && !this.boxes.has(id)) this.boxes.clear();
    this.boxes.set(id, rect);
  }

  get(id: string): Rect | undefined {
    return this.boxes.get(id);
  }
}
