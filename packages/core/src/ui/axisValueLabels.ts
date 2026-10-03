import type { Theme } from '@tradecanvas/commons';
import { fillTag } from './shapes.js';

/** A coloured tag on a value axis: an indicator line's latest value. */
export interface AxisValueLabel {
  /** Where the value sits on the axis (px). */
  y: number;
  text: string;
  /** The line's colour: the tag's background. */
  color: string;
}

/**
 * Decimals for an indicator value of this size (RSI 54.32, MACD 0.0012,
 * 12,345.7): two for everyday values, fewer for big ones, more for small.
 */
export function indicatorValuePrecision(value: number): number {
  const size = Math.abs(value);
  return size >= 1000 ? 1 : size >= 1 ? 2 : size >= 0.01 ? 4 : 6;
}

/** Tag height (px); tags closer than this are pushed apart. */
export const AXIS_LABEL_HEIGHT = 16;

/**
 * Positions for tags at `ys` (sorted ascending) so that none overlap, each as
 * close to its own value as the others allow, within `[top, bottom]`. When
 * they cannot all fit, the first ones keep their place and the rest run past
 * `bottom` (the renderer leaves those out).
 */
export function spreadLabels(ys: readonly number[], top: number, bottom: number, height = AXIS_LABEL_HEIGHT): number[] {
  const half = height / 2;
  const out = ys.map((y) => Math.min(Math.max(y, top + half), bottom - half));
  // Downward pass: each tag at least one height below the one above.
  for (let i = 1; i < out.length; i++) out[i] = Math.max(out[i], out[i - 1] + height);
  // Upward pass: what ran off the bottom moves back up.
  if (out.length > 0) out[out.length - 1] = Math.min(out[out.length - 1], bottom - half);
  for (let i = out.length - 2; i >= 0; i--) out[i] = Math.min(out[i], out[i + 1] - height);
  // Too many to fit: back inside the top, and down from there.
  if (out.length > 0 && out[0] < top + half) {
    out[0] = top + half;
    for (let i = 1; i < out.length; i++) out[i] = Math.max(out[i], out[i - 1] + height);
  }
  return out;
}

/** Dark text on a light tag, light text on a dark one. */
export function labelTextColor(background: string): string {
  const rgb = parseColor(background);
  if (!rgb) return '#ffffff';
  const [r, g, b] = rgb;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? '#10131a' : '#ffffff';
}

function parseColor(color: string): [number, number, number] | null {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].replace(/./g, (c) => c + c) : hex[1];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(color.trim());
  return rgb ? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])] : null;
}

/**
 * Draw `labels` on the value axis whose left edge is `axisX`, within the
 * vertical `bounds`. Tags off the axis are dropped; the rest are spread so
 * they do not overlap.
 */
export function renderAxisValueLabels(
  ctx: CanvasRenderingContext2D,
  labels: readonly AxisValueLabel[],
  axisX: number,
  axisWidth: number,
  bounds: { top: number; bottom: number },
  theme: Theme,
): void {
  const shown = labels.filter((l) => l.y >= bounds.top && l.y <= bounds.bottom).sort((a, b) => a.y - b.y);
  if (shown.length === 0) return;
  const ys = spreadLabels(shown.map((l) => l.y), bounds.top, bounds.bottom);
  ctx.save();
  ctx.font = `bold ${theme.font.sizeSmall}px ${theme.font.family}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const half = AXIS_LABEL_HEIGHT / 2;
  for (let i = 0; i < shown.length; i++) {
    const label = shown[i];
    const y = ys[i];
    if (y + half > bounds.bottom + 0.5) break; // no room left on this axis
    const width = Math.min(ctx.measureText(label.text).width + 10, axisWidth - 2);
    ctx.fillStyle = label.color;
    fillTag(ctx, axisX + 1, Math.round(y - half), width, AXIS_LABEL_HEIGHT, theme);
    ctx.fillStyle = labelTextColor(label.color);
    ctx.fillText(label.text, axisX + 5, Math.round(y));
  }
  ctx.restore();
}
