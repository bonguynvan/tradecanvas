import type { DrawingStyle } from '@tradecanvas/commons';
import { drawingFill, drawingLook, textSize } from '../drawingLook.js';
import { fillTextWithHalo } from './labels.js';
import { readableOn } from '@tradecanvas/commons';

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
}

/**
 * The look of a drawing's text from its style (`DrawingStyle`'s text
 * fields), over the tool's own defaults: `box` and `border` say whether
 * the tool draws them unless the style says, `width` where it wraps.
 */
export function textLook(
  style: DrawingStyle,
  defaults: { box: boolean; border: boolean; width: number; fill?: boolean },
): TextBoxLook {
  const box = style.textBackground ?? defaults.box;
  const border = style.textBorder ?? defaults.border;
  // A fill set by hand as kept, its alpha included; else the line's colour, tinted, where the tool fills.
  const fill = !defaults.fill && !style.fillColor ? undefined : drawingFill(style);
  const look = drawingLook();
  return {
    fontSize: textSize(style),
    // Text in the line's colour, deepened where it would not read on the chart (a light background).
    color: style.textColor ?? readableText(style.color, look.background, look.ink),
    fill: box && fill ? fill : undefined,
    stroke: border ? style.borderColor ?? style.color : undefined,
    maxWidth: style.textWrap === undefined ? defaults.width : style.textWrap > 0 ? style.textWrap : Infinity,
    bold: style.bold,
    italic: style.italic,
    align: style.textAlign,
  };
}


export const PAD_X = 8;
export const PAD_Y = 6;
const LINE_GAP = 1.3;
/** Most lines shown; the rest is cut with an ellipsis. */
const MAX_LINES = 12;

/** The contrast a drawing's text keeps on the chart's background (WCAG for small text). */
const TEXT_CONTRAST = 4.5;
/** Text colours that read, by colour, background and ink: worked out once, not on every frame. */
const readable = new Map<string, string>();
const READABLE_CACHE_SIZE = 64;

function readableText(color: string, background: string, ink: string): string {
  const key = `${color}|${background}|${ink}`;
  let out = readable.get(key);
  if (out === undefined) {
    if (readable.size >= READABLE_CACHE_SIZE) readable.clear();
    out = readableOn(color, background, ink, TEXT_CONTRAST);
    readable.set(key, out);
  }
  return out;
}
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
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(bx, by, Math.round(rect.width) - 1, Math.round(rect.height) - 1, BOX_RADIUS);
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
