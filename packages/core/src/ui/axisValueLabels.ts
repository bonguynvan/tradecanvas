import type { Theme } from '@tradecanvas/commons';
import { contrastRatio, inkOn, readableOn } from '@tradecanvas/commons';
import { AXIS_TAG_TEXT_INSET, fillTag, outlineTag } from './shapes.js';

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

const TAG_INK_DARK = '#10131a';
const TAG_INK_LIGHT = '#ffffff';
/**
 * How much more contrast the dark ink must have to be chosen: near a tie the light one is, as dark
 * ink on a deep, full colour reads muddier than its ratio says.
 */
const DARK_INK_LEAD = 1.25;

/**
 * The ink a tag's text is written in: the dark or the light one, whichever has the more contrast
 * on the tag's fill (the dark one by a clear lead, `DARK_INK_LEAD`). White on a candle's green or
 * red is under 3:1, so the middle colours a chart is drawn in take the dark ink; only a deep fill
 * takes the light one. A fill's alpha is not counted, and a colour that cannot be read (a name,
 * `hsl()`) takes the light ink, as before.
 */
export function labelTextColor(background: string): string {
  return darkInkReads(background) ? TAG_INK_DARK : TAG_INK_LIGHT;
}

/** Whether a fill takes the dark ink (see `labelTextColor`): for a tag written in a theme's own two inks. */
export function darkInkReads(background: string): boolean {
  const onDark = contrastRatio(background, TAG_INK_DARK);
  const onLight = contrastRatio(background, TAG_INK_LIGHT);
  if (onDark === null || onLight === null) return false;
  return onDark >= onLight * DARK_INK_LEAD;
}

/** The contrast a filled tag's ink has on its fill, at the least. */
const TAG_CONTRAST = 4.5;

/**
 * The colour a tag is filled with: `fill`, or, where the ink it takes
 * (`labelTextColor`) would not read on it at 4.5:1, the nearest shade of it
 * that the ink does read on, its hue kept. A light chart's candles are of a
 * middle lightness on which white is 4:1 and dark ink no better: the candle
 * keeps its colour, its tag is a shade deeper. A colour that cannot be read
 * is left as it is.
 */
export function tagFill(fill: string): string {
  const ink = labelTextColor(fill);
  return readableOn(fill, ink, ink === TAG_INK_LIGHT ? TAG_INK_DARK : TAG_INK_LIGHT, TAG_CONTRAST);
}

/** The contrast a value written on an outlined tag has on its ground, at the least. */
const OUTLINED_TEXT_CONTRAST = 4.5;

/**
 * The colour of the figure on an outlined tag: its line's, taken toward the ink that reads on the
 * ground (dark on a light one, light on a dark one) until it reads there at 4.5:1, its hue kept.
 * A ground that is no colour (a stand-in theme's) leaves the line's colour as it is.
 */
export function outlinedTagText(color: string, ground: string): string {
  if (typeof ground !== 'string') return color;
  return readableOn(color, ground, inkOn(ground, TAG_INK_DARK, TAG_INK_LIGHT), OUTLINED_TEXT_CONTRAST);
}

/** A tag already on the axis that value tags keep clear of: its centre and half its height. */
export interface FixedAxisTag {
  y: number;
  half: number;
}

/**
 * Where `labels` go on an axis within `bounds`, kept clear of `fixed` tags
 * (the last price, high/low, orders): each tag stays on its value's side of
 * a fixed tag and is spread among its neighbours there. Tags off the axis,
 * or without room left between fixed tags, are left out.
 */
export function layoutAxisValueLabels(
  labels: readonly AxisValueLabel[],
  bounds: { top: number; bottom: number },
  fixed: readonly FixedAxisTag[] = [],
  height = AXIS_LABEL_HEIGHT,
): AxisValueLabel[] {
  const half = height / 2;
  const walls = fixed.filter((w) => w.y + w.half > bounds.top && w.y - w.half < bounds.bottom).sort((a, b) => a.y - b.y);
  const shown = labels.filter((l) => l.y >= bounds.top && l.y <= bounds.bottom).sort((a, b) => a.y - b.y);
  const out: AxisValueLabel[] = [];
  let next = 0;
  // The lowest bottom edge of the walls so far: a tall wall can reach past a later one.
  let reach = bounds.top;
  for (let k = 0; k <= walls.length; k++) {
    if (k > 0) reach = Math.max(reach, walls[k - 1].y + walls[k - 1].half);
    const top = reach;
    const bottom = k === walls.length ? bounds.bottom : walls[k].y - walls[k].half;
    const limit = k === walls.length ? Infinity : walls[k].y;
    const first = next;
    while (next < shown.length && shown[next].y < limit) next++;
    const group = shown.slice(first, next);
    if (group.length === 0 || bottom - top < height) continue;
    const ys = spreadLabels(group.map((l) => l.y), top, bottom, height);
    group.forEach((label, i) => {
      if (ys[i] - half >= top - 0.5 && ys[i] + half <= bottom + 0.5) out.push({ ...label, y: ys[i] });
    });
  }
  return out;
}

/**
 * Draw tags already laid out (`layoutAxisValueLabels`) on the axis whose
 * left edge is `axisX`. `ground`: what is under them, which an outlined tag
 * is filled with (the chart's background unless a pane has its own).
 */
export function drawAxisValueLabels(
  ctx: CanvasRenderingContext2D,
  labels: readonly AxisValueLabel[],
  axisX: number,
  axisWidth: number,
  theme: Theme,
  ground: string = theme.background,
): void {
  if (labels.length === 0) return;
  ctx.save();
  ctx.font = `bold ${theme.font.sizeSmall}px ${theme.font.family}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const half = AXIS_LABEL_HEIGHT / 2;
  // Outlined: the chart's ground under an edge and a text in the line's colour, where a look wants no blocks of colour.
  const outlined = theme.style?.axis.price.valueTagsOutlined === true;
  for (const label of labels) {
    const top = Math.round(label.y - half);
    // The axis's width, as an order's tag and the last price's are.
    if (outlined) {
      outlineTag(ctx, axisX + 1, top, axisWidth - 2, AXIS_LABEL_HEIGHT, theme, label.color, ground);
      ctx.fillStyle = outlinedTagText(label.color, ground);
    } else {
      const fill = tagFill(label.color);
      ctx.fillStyle = fill;
      fillTag(ctx, axisX + 1, top, axisWidth - 2, AXIS_LABEL_HEIGHT, theme);
      ctx.fillStyle = labelTextColor(fill);
    }
    ctx.fillText(label.text, axisX + 1 + AXIS_TAG_TEXT_INSET, Math.round(label.y));
  }
  ctx.restore();
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
  ground?: string,
): void {
  drawAxisValueLabels(ctx, layoutAxisValueLabels(labels, bounds), axisX, axisWidth, theme, ground);
}
