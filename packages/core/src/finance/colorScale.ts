import type { ColorScale, Theme } from '@tradecanvas/commons';
import { LABEL_SIZE, fontOf, type Rect } from './chartKit.js';

/** A colour scale with its range worked out. */
export interface ResolvedScale {
  negative: string;
  zero: string;
  positive: string;
  min: number;
  max: number;
}

/** Room under a chart for its colour bar and the bar's labels, px. */
export const COLOR_BAR_ROOM = 28;
const BAR_HEIGHT = 8;
const BAR_STEPS = 32;

type Rgb = [number, number, number];

const parsed = new Map<string, Rgb | null>();

/** Hex (#rgb, #rgba, #rrggbb, #rrggbbaa) and rgb()/rgba() in numbers; alpha is ignored. Others give null. */
function parseRgb(color: string): Rgb | null {
  let rgb = parsed.get(color);
  if (rgb === undefined) {
    rgb = readRgb(color);
    // A scale has a handful of colours: the cache stays small unless colours are made per value.
    if (parsed.size > 512) parsed.clear();
    parsed.set(color, rgb);
  }
  return rgb;
}

function readRgb(color: string): Rgb | null {
  const c = color.trim();
  const hex = c.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length <= 4) h = [...h.slice(0, 3)].map((d) => d + d).join('');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const rgb = c.match(/^rgba?\(\s*(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)/i);
  return rgb ? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])] : null;
}

/** `a` to `b` by `t`; colours it can't read switch over at the middle instead. */
function mix(a: string, b: string, t: number): string {
  const ca = parseRgb(a);
  const cb = parseRgb(b);
  if (!ca || !cb) return t < 0.5 ? a : b;
  const ch = (i: number) => Math.round(ca[i] + (cb[i] - ca[i]) * t);
  return `rgb(${ch(0)},${ch(1)},${ch(2)})`;
}

/**
 * The scale a chart colours by: the one given, its range filled in from the
 * values (either side of zero evenly when any is negative, else from zero up),
 * and the theme's down and up colours by default.
 */
export function resolveColorScale(values: Iterable<number>, theme: Theme, scale?: ColorScale): ResolvedScale {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of values) {
    if (!Number.isFinite(v)) continue;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  let min = 0;
  let max = 1;
  if (lo <= hi) {
    const reach = Math.max(Math.abs(lo), Math.abs(hi)) || 1;
    min = lo < 0 ? -reach : 0;
    max = lo < 0 ? reach : hi || 1;
  }
  return {
    negative: scale?.negative ?? theme.candleDown,
    zero: scale?.zero ?? mix(theme.background, theme.text, 0.14),
    positive: scale?.positive ?? theme.candleUp,
    min: scale?.min !== undefined && Number.isFinite(scale.min) ? scale.min : min,
    max: scale?.max !== undefined && Number.isFinite(scale.max) ? scale.max : max,
  };
}

/** The colour of `value`: the zero colour at 0, the end colours at the range's ends and past them. */
export function scaleColor(value: number, scale: ResolvedScale): string {
  if (!Number.isFinite(value) || value === 0) return mix(scale.zero, scale.zero, 0);
  if (value < 0) return mix(scale.zero, scale.negative, scale.min < 0 ? Math.min(1, value / scale.min) : 1);
  return mix(scale.zero, scale.positive, scale.max > 0 ? Math.min(1, value / scale.max) : 1);
}

const DARK_TEXT = '#11151b';
/** DARK_TEXT's relative luminance. */
const DARK_LUMINANCE = 0.0076;

/** Near-white or near-black, whichever contrasts more with `color`. */
export function readableText(color: string): string {
  const rgb = parseRgb(color);
  if (!rgb) return '#ffffff';
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return (lum + 0.05) / (DARK_LUMINANCE + 0.05) > 1.05 / (lum + 0.05) ? DARK_TEXT : '#ffffff';
}

/** The scale as a bar from its min to its max, the ends (and zero, inside them) labelled below. */
export function drawColorBar(ctx: CanvasRenderingContext2D, area: Rect, scale: ResolvedScale, format: (v: number) => string, theme: Theme): void {
  const width = Math.min(180, area.width);
  if (width < 40 || !(scale.max > scale.min)) return;
  const { x, y } = area;
  const span = scale.max - scale.min;
  ctx.save();
  for (let i = 0; i < BAR_STEPS; i++) {
    const t = (i + 0.5) / BAR_STEPS;
    ctx.fillStyle = scaleColor(scale.min + span * t, scale);
    ctx.fillRect(x + (width * i) / BAR_STEPS, y, width / BAR_STEPS + 0.5, BAR_HEIGHT);
  }
  ctx.font = fontOf(theme, LABEL_SIZE - 1);
  ctx.fillStyle = theme.textSecondary;
  ctx.textBaseline = 'top';
  const ly = y + BAR_HEIGHT + 4;
  ctx.textAlign = 'left';
  ctx.fillText(format(scale.min), x, ly);
  ctx.textAlign = 'right';
  ctx.fillText(format(scale.max), x + width, ly);
  const zeroX = x + (width * -scale.min) / span;
  // Zero gets a label where it is clear of the ends'.
  if (scale.min < 0 && scale.max > 0 && zeroX - x > 28 && x + width - zeroX > 28) {
    ctx.textAlign = 'center';
    ctx.fillText(format(0), zeroX, ly);
  }
  ctx.restore();
}
