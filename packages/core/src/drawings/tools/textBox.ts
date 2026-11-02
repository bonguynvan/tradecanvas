import type { DrawingStyle } from '@tradecanvas/commons';
import { drawingFontFamily } from './labels.js';

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
  defaults: { fontSize: number; box: boolean; border: boolean; width: number; fill?: string },
): TextBoxLook {
  const box = style.textBackground ?? defaults.box;
  const border = style.textBorder ?? defaults.border;
  // The fill as kept, its alpha included, as a note's always was.
  const fill = style.fillColor ?? defaults.fill;
  return {
    fontSize: style.fontSize || defaults.fontSize,
    color: style.textColor ?? style.color,
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

export function boxFont(fontSize: number, bold = false, italic = false): string {
  return `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${fontSize}px ${drawingFontFamily()}`;
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
  if (look.fill) {
    ctx.fillStyle = look.fill;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  }
  if (look.stroke) {
    ctx.strokeStyle = look.stroke;
    ctx.lineWidth = 1;
    ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.width - 1, rect.height - 1);
  }
  ctx.fillStyle = look.color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const inner = rect.width - PAD_X * 2;
  lines.forEach((line, i) => {
    const room = inner - measure(line);
    const shift = look.align === 'center' ? room / 2 : look.align === 'right' ? room : 0;
    ctx.fillText(line, x + PAD_X + shift, y + PAD_Y + i * look.fontSize * LINE_GAP);
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
