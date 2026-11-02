import type { DrawingStyle } from '../types/drawing.js';

const LINE_STYLES: readonly DrawingStyle['lineStyle'][] = ['solid', 'dashed', 'dotted'];
const MAX_COLOR = 64;
const MAX_TEXT = 2000;
const MAX_LINE_WIDTH = 20;
const MAX_FONT_SIZE = 200;
/** Widest a text may be set to run before it wraps, px. */
const MAX_TEXT_WRAP = 4000;
/** Narrowest a wrap width may be, px: room for a short word. */
const MIN_TEXT_WRAP = 20;
const TEXT_ALIGNS: readonly NonNullable<DrawingStyle['textAlign']>[] = ['left', 'center', 'right'];
const TEXT_VALIGNS: readonly NonNullable<DrawingStyle['textVAlign']>[] = ['top', 'middle', 'bottom'];

function finiteIn(value: unknown, min: number, max: number): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : undefined;
}

function colorValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_COLOR ? value : undefined;
}

/**
 * The valid fields of a drawing style from untrusted data (a saved layout, a
 * template): colours as short strings, a known line style, widths, opacity
 * and font size as finite numbers in range, text cut to length. Anything
 * else is dropped.
 */
export function sanitizeDrawingStyle(raw: unknown): Partial<DrawingStyle> {
  if (typeof raw !== 'object' || raw === null) return {};
  const obj = raw as Record<string, unknown>;
  const out: Partial<DrawingStyle> = {};
  const color = colorValue(obj.color);
  if (color !== undefined) out.color = color;
  const lineWidth = finiteIn(obj.lineWidth, 0.5, MAX_LINE_WIDTH);
  if (lineWidth !== undefined) out.lineWidth = lineWidth;
  if (LINE_STYLES.includes(obj.lineStyle as DrawingStyle['lineStyle'])) out.lineStyle = obj.lineStyle as DrawingStyle['lineStyle'];
  const fillColor = colorValue(obj.fillColor);
  if (fillColor !== undefined) out.fillColor = fillColor;
  const fillOpacity = finiteIn(obj.fillOpacity, 0, 1);
  if (fillOpacity !== undefined) out.fillOpacity = fillOpacity;
  const fontSize = finiteIn(obj.fontSize, 6, MAX_FONT_SIZE);
  if (fontSize !== undefined) out.fontSize = fontSize;
  if (typeof obj.text === 'string') out.text = obj.text.slice(0, MAX_TEXT);
  for (const key of ['bold', 'italic', 'textBackground', 'textBorder'] as const) {
    if (typeof obj[key] === 'boolean') out[key] = obj[key] as boolean;
  }
  if (TEXT_ALIGNS.includes(obj.textAlign as NonNullable<DrawingStyle['textAlign']>)) out.textAlign = obj.textAlign as DrawingStyle['textAlign'];
  if (TEXT_VALIGNS.includes(obj.textVAlign as NonNullable<DrawingStyle['textVAlign']>)) out.textVAlign = obj.textVAlign as DrawingStyle['textVAlign'];
  const textColor = colorValue(obj.textColor);
  if (textColor !== undefined) out.textColor = textColor;
  const borderColor = colorValue(obj.borderColor);
  if (borderColor !== undefined) out.borderColor = borderColor;
  // 0 wraps only where the text breaks; any other width is kept to what a word fits in and a screen could use.
  if (typeof obj.textWrap === 'number' && Number.isFinite(obj.textWrap) && obj.textWrap >= 0) {
    out.textWrap = obj.textWrap === 0 ? 0 : Math.min(MAX_TEXT_WRAP, Math.max(MIN_TEXT_WRAP, obj.textWrap));
  }
  return out;
}
