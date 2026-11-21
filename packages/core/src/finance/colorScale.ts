import type { ColorRamp, ColorScale, Theme } from '@tradecanvas/commons';
import { TC_SERIES_COLORS } from '@tradecanvas/commons';
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
/** The bar's own length, when its labels need no more. */
const BAR_MAX_WIDTH = 180;
/** Shorter than this a bar shows no colours worth reading. */
const BAR_MIN_WIDTH = 40;
/** The labels' size, a step under the charts' other labels. */
export const BAR_LABEL_SIZE = LABEL_SIZE - 1;
/** Space kept between two of the bar's labels, px. */
const BAR_LABEL_GAP = 8;
/** What the layout adds over the labels' exact need, so the drawing's own sums never fall a hair short. */
const BAR_FIT_SLACK = 0.5;

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

/** A colour ramp with its colours and its range worked out. */
export interface ResolvedRamp {
  /** Two colours or more, the lowest value's first. */
  colors: string[];
  min: number;
  max: number;
}

/** How far the default ramp's low end is from the chart's ground towards its hue, and its high end from the hue towards the text. */
const RAMP_LOW = 0.3;
const RAMP_HIGH = 0.55;

/**
 * The ramp a chart colours by: the colours given, else one hue from near
 * the theme's ground up to its strongest (so low values stand back in a dark
 * theme and in a light one), over the range given, else the values' own.
 */
export function resolveColorRamp(values: Iterable<number>, theme: Theme, ramp?: ColorRamp): ResolvedRamp {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of values) {
    if (!Number.isFinite(v)) continue;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const given = (ramp?.colors ?? []).filter((color) => typeof color === 'string' && color.trim() !== '');
  const hue = TC_SERIES_COLORS[0];
  const colors = given.length > 1 ? given : given.length === 1 ? [given[0], given[0]] : [mix(theme.background, hue, RAMP_LOW), hue, mix(hue, theme.text, RAMP_HIGH)];
  return {
    colors,
    min: ramp?.min !== undefined && Number.isFinite(ramp.min) ? ramp.min : lo <= hi ? lo : 0,
    max: ramp?.max !== undefined && Number.isFinite(ramp.max) ? ramp.max : lo <= hi ? hi : 1,
  };
}

/** A colour's parts under `light`: darker under 1, towards white over it. */
function lit(rgb: Rgb, light: number): string {
  const part = (c: number) => Math.round(Math.max(0, Math.min(255, light <= 1 ? c * light : c + (255 - c) * (light - 1))));
  return `rgb(${part(rgb[0])},${part(rgb[1])},${part(rgb[2])})`;
}

/**
 * The colour of `value` on a ramp: blended between the two colours it falls
 * among, the end colours at the range's ends and past them. `light` makes it
 * darker (under 1) or lighter (over 1), as a face turned from the light or
 * to it. Colours that cannot be read change in steps and take no light.
 */
export function rampColor(value: number, ramp: ResolvedRamp, light = 1): string {
  const span = ramp.max - ramp.min;
  const share = span > 0 && Number.isFinite(value) ? Math.max(0, Math.min(1, (value - ramp.min) / span)) : 0.5;
  const at = share * (ramp.colors.length - 1);
  const below = Math.min(ramp.colors.length - 2, Math.floor(at));
  const a = parseRgb(ramp.colors[below]);
  const b = parseRgb(ramp.colors[below + 1]);
  if (!a || !b) return at - below < 0.5 ? ramp.colors[below] : ramp.colors[below + 1];
  const t = at - below;
  return lit([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], light);
}

/** `color` under `light`, as `rampColor` has it; a colour that cannot be read stays as it is. */
export function litColor(color: string, light: number): string {
  const rgb = parseRgb(color);
  return rgb ? lit(rgb, light) : color;
}

/** The scale as a bar from its min to its max, the ends (and zero, inside them) labelled below. */
export function drawColorBar(ctx: CanvasRenderingContext2D, area: Rect, scale: ResolvedScale, format: (v: number) => string, theme: Theme): void {
  drawRangeBar(ctx, area, scale, (value) => scaleColor(value, scale), format, theme);
}

/** A bar of the colours `colorOf` gives from `scale.min` to `scale.max`, the ends (and zero, inside them) labelled below. */
export function drawRangeBar(
  ctx: CanvasRenderingContext2D,
  area: Rect,
  scale: { min: number; max: number },
  colorOf: (value: number) => string,
  format: (v: number) => string,
  theme: Theme,
): void {
  if (!(scale.max > scale.min)) return;
  ctx.save();
  ctx.font = fontOf(theme, BAR_LABEL_SIZE);
  const measure = (text: string): number => ctx.measureText(text).width;
  // As long as its labels need, up to the room it has: a narrow chart's bar reaches past the chart's own width.
  const width = Math.min(area.width, Math.max(BAR_MAX_WIDTH, colorBarLabelWidth(scale, format, measure)));
  if (width < BAR_MIN_WIDTH) {
    ctx.restore();
    return;
  }
  const { x, y } = area;
  const span = scale.max - scale.min;
  for (let i = 0; i < BAR_STEPS; i++) {
    const t = (i + 0.5) / BAR_STEPS;
    ctx.fillStyle = colorOf(scale.min + span * t);
    ctx.fillRect(x + (width * i) / BAR_STEPS, y, width / BAR_STEPS + 0.5, BAR_HEIGHT);
  }
  ctx.fillStyle = theme.textSecondary;
  ctx.textBaseline = 'top';
  const ly = y + BAR_HEIGHT + 4;
  const minText = format(scale.min);
  const maxText = format(scale.max);
  const minEnd = x + measure(minText);
  const maxStart = x + width - measure(maxText);
  // Labels that would run into each other are left out, the middle one first.
  if (maxStart - minEnd >= BAR_LABEL_GAP) {
    ctx.textAlign = 'left';
    ctx.fillText(minText, x, ly);
    ctx.textAlign = 'right';
    ctx.fillText(maxText, x + width, ly);
    if (scale.min < 0 && scale.max > 0) {
      const zeroX = x + (width * -scale.min) / span;
      const zeroText = format(0);
      const half = measure(zeroText) / 2;
      if (zeroX - half - minEnd >= BAR_LABEL_GAP && maxStart - (zeroX + half) >= BAR_LABEL_GAP) {
        ctx.textAlign = 'center';
        ctx.fillText(zeroText, zeroX, ly);
      }
    }
  }
  ctx.restore();
}

/**
 * The width a colour bar needs for its labels to stand apart: the two ends,
 * and zero between them when the scale crosses it. `measure` is at the
 * bar's label size.
 */
export function colorBarLabelWidth(scale: { min: number; max: number }, format: (v: number) => string, measure: (text: string) => number): number {
  if (!(scale.max > scale.min)) return 0;
  const ends = measure(format(scale.min)) + measure(format(scale.max));
  if (!(scale.min < 0 && scale.max > 0)) return ends + BAR_LABEL_GAP;
  // Zero sits where it falls on the bar: room for its label to clear both ends there, as long
  // as that keeps the bar to its own length. Near an end zero would need a bar across the
  // chart, and the drawing leaves that label out anyway.
  const zero = measure(format(0));
  const share = -scale.min / (scale.max - scale.min);
  const left = (measure(format(scale.min)) + BAR_LABEL_GAP + zero / 2) / share;
  const right = (measure(format(scale.max)) + BAR_LABEL_GAP + zero / 2) / (1 - share);
  const withZero = Math.max(left, right);
  return withZero <= BAR_MAX_WIDTH ? Math.max(ends, withZero) + BAR_FIT_SLACK : ends + BAR_LABEL_GAP;
}
