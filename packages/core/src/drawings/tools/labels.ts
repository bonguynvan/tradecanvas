import type { DrawingState, ViewportState } from '@tradecanvas/commons';
import { resolveBarIndex } from '../../viewport/ScaleMapping.js';

/** Shared label helpers for the measuring / pattern drawing tools. */

const LABEL_FONT = '11px sans-serif';
const LABEL_LINE_HEIGHT = 14;
const LABEL_PAD_X = 6;
const LABEL_PAD_Y = 4;
const LABEL_BG = 'rgba(19, 23, 34, 0.85)';
const LABEL_FG = '#FFFFFF';

const MS_MINUTE = 60_000;
const MS_HOUR = 60 * MS_MINUTE;
const MS_DAY = 24 * MS_HOUR;

/**
 * Decimals for prices around `ref`: 2 for most assets, 4 for prices between
 * 1 and 10 (FX majors), and 4 significant digits below 1 (small caps).
 */
function priceDecimals(ref: number): number {
  const abs = Math.abs(ref);
  if (abs >= 10 || abs === 0) return 2;
  if (abs >= 1) return 4;
  return Math.min(10, Math.ceil(-Math.log10(abs)) + 3);
}

/** Price text at the precision of `ref` (defaults to the price itself). */
export function formatDrawingPrice(price: number, ref = price): string {
  return price.toFixed(priceDecimals(ref));
}

/** Signed price change with its percentage of `from`, e.g. "+12.50 (+1.25%)". */
export function formatPriceChange(from: number, to: number): string {
  const diff = to - from;
  const pct = from !== 0 ? (diff / from) * 100 : 0;
  const sign = diff >= 0 ? '+' : '';
  // A change is shown at the precision of the price it moved from.
  return `${sign}${formatDrawingPrice(diff, from)} (${sign}${pct.toFixed(2)}%)`;
}

/** Compact duration, e.g. "3d 4h", "45m", "2w 1d". */
export function formatDuration(ms: number): string {
  const abs = Math.abs(ms);
  if (abs < MS_HOUR) return `${Math.round(abs / MS_MINUTE)}m`;
  if (abs < MS_DAY) {
    const h = Math.floor(abs / MS_HOUR);
    const m = Math.round((abs - h * MS_HOUR) / MS_MINUTE);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  const days = Math.floor(abs / MS_DAY);
  const h = Math.round((abs - days * MS_DAY) / MS_HOUR);
  if (days >= 7) {
    const w = Math.floor(days / 7);
    const d = days - w * 7;
    return d > 0 ? `${w}w ${d}d` : `${w}w`;
  }
  return h > 0 ? `${days}d ${h}h` : `${days}d`;
}

/** Whether anchors carry real timestamps (vs. legacy bar indices). */
export function hasTimestamps(viewport: ViewportState): boolean {
  return !!viewport.data && viewport.data.length > 0;
}

/** Whole bars between two anchors on the current timeframe. */
export function barsBetween(state: DrawingState, a: number, b: number, viewport: ViewportState): number {
  const ia = resolveBarIndex(state.anchors[a].time, viewport);
  const ib = resolveBarIndex(state.anchors[b].time, viewport);
  return Math.round(Math.abs(ib - ia));
}

/** Time span between two anchors as text, or null when anchors are bar indices. */
export function spanBetween(state: DrawingState, a: number, b: number, viewport: ViewportState): string | null {
  if (!hasTimestamps(viewport)) return null;
  return formatDuration(state.anchors[b].time - state.anchors[a].time);
}

/**
 * Multi-line label on a dark rounded box. `(x, y)` is the box's anchor point:
 * `align` picks which horizontal edge/center sits on x, and the box grows
 * upward from y when `above`, downward otherwise. Returns the box rect.
 */
export function drawLabelBox(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  align: 'left' | 'center' | 'right' = 'center',
  above = true,
): { x: number; y: number; width: number; height: number } {
  ctx.font = LABEL_FONT;
  let textW = 0;
  for (const line of lines) textW = Math.max(textW, ctx.measureText(line).width);
  const width = textW + LABEL_PAD_X * 2;
  const height = lines.length * LABEL_LINE_HEIGHT + LABEL_PAD_Y * 2;
  const left = align === 'left' ? x : align === 'right' ? x - width : x - width / 2;
  const top = above ? y - height : y;

  ctx.fillStyle = LABEL_BG;
  ctx.fillRect(left, top, width, height);
  ctx.fillStyle = LABEL_FG;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], left + LABEL_PAD_X, top + LABEL_PAD_Y + i * LABEL_LINE_HEIGHT);
  }
  return { x: left, y: top, width, height };
}

/** Ratio of two price legs, e.g. |BC| / |AB|, as text ("0.618"). */
export function legRatio(state: DrawingState, num: [number, number], den: [number, number]): string {
  const n = Math.abs(state.anchors[num[1]].price - state.anchors[num[0]].price);
  const d = Math.abs(state.anchors[den[1]].price - state.anchors[den[0]].price);
  return d === 0 ? '—' : (n / d).toFixed(3);
}
