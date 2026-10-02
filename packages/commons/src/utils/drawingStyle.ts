import type { DrawingStyle } from '../types/drawing.js';

const LINE_STYLES: readonly DrawingStyle['lineStyle'][] = ['solid', 'dashed', 'dotted'];
const MAX_COLOR = 64;
const MAX_TEXT = 2000;
const MAX_LINE_WIDTH = 20;
const MAX_FONT_SIZE = 200;

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
  return out;
}
