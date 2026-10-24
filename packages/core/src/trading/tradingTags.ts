import type { IconDef, Theme, ViewportState } from '@tradecanvas/commons';
import { PRICE_AXIS_WIDTH } from '@tradecanvas/commons';
import { drawIcon } from '../ui/drawIcon.js';
import { fillTag, tagPath } from '../ui/shapes.js';
import { AXIS_LABEL_HEIGHT, labelTextColor, spreadLabels } from '../ui/axisValueLabels.js';
import type { LineButton, LineButtonAction } from './lineButtons.js';
import type { BracketHandle } from './BracketTool.js';

/** A tag's height, px: a Fibonacci number, as the built-in look's sizes are. */
export const TAG_HEIGHT = 21;
/** Between one tag and the next, and between the last and the price axis, px. */
export const TAG_GAP = 8;
/** Room each side of a cell's text, px. */
const CELL_PAD = 5;
/** An icon in a button cell: the cell over φ. */
const ICON_SIZE = 13;
/** Tags this much nearer than their height share a row, and must not overlap. */
const ROW = TAG_HEIGHT + 1;

/**
 * One cell of a tag on a trading line: a stamp in the line's colour (the
 * quantity, SL, TP), words or a figure on the tag's ground, or a button
 * (an icon) that acts on the line.
 */
export type TagCell =
  | { kind: 'stamp'; text: string }
  | { kind: 'text'; text: string; color?: string }
  | { kind: 'button'; icon: IconDef; action: LineButtonAction };

/** The line a press on a tag takes, by what it is: tags of lines near each other sit side by side. */
export type TagGrab =
  | { kind: 'order'; orderId: string }
  | { kind: 'stop'; positionId: string; which: 'stopLoss' | 'takeProfit' }
  | { kind: 'bracket'; handle: BracketHandle }
  | { kind: 'draft' };

/** A tag on the line at `y`, bordered in the line's `color`. */
export interface TradingTag {
  y: number;
  color: string;
  cells: readonly TagCell[];
  /** The line a press on it takes, as a press on the line itself would; none for a line that doesn't move. */
  grab?: TagGrab;
}

/** Where a tag that takes its line was drawn (on the plot), its line's y, and the line. */
export interface TagBox {
  x: number;
  y: number;
  width: number;
  height: number;
  lineY: number;
  grab: TagGrab;
}

/** The tag a press at (`x`, `y`) is on, of those that take their line. */
export function tagAt(boxes: readonly TagBox[], x: number, y: number): TagBox | null {
  for (let i = boxes.length - 1; i >= 0; i--) {
    const b = boxes[i];
    if (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) return b;
  }
  return null;
}

function cellFont(cell: TagCell, theme: Theme): string {
  return `${cell.kind === 'stamp' ? '600 ' : ''}${theme.font.sizeSmall}px ${theme.font.family}`;
}

/** A cell's width: its text and the room around it, or a square as high as the tag. */
function cellWidth(ctx: CanvasRenderingContext2D, cell: TagCell, theme: Theme): number {
  if (cell.kind === 'button') return TAG_HEIGHT;
  ctx.font = cellFont(cell, theme);
  return Math.ceil(ctx.measureText(cell.text).width) + CELL_PAD * 2;
}

/** A tag's width: its cells side by side. */
export function tagWidth(ctx: CanvasRenderingContext2D, tag: TradingTag, theme: Theme): number {
  return tag.cells.reduce((sum, cell) => sum + cellWidth(ctx, cell, theme), 0);
}

/** The top of a tag centred on the line at `y`, on the pixel grid. */
function tagTop(y: number): number {
  return Math.round(y) - Math.floor(TAG_HEIGHT / 2);
}

/**
 * Where each tag starts: at the right end of its line, a gap short of the
 * price axis, unless it would cover a tag laid out before it, when it moves
 * to that tag's left (and on past any other it then covers). The first tags
 * keep the axis end: lay out the ones that matter most first. One that runs
 * into the plot's left edge stops there and does not fit: it may lie under
 * another.
 */
export function layoutTags(
  items: readonly { y: number; width: number }[],
  plot: { left: number; right: number },
): { x: number; fits: boolean }[] {
  const placed: { x0: number; x1: number; y: number }[] = [];
  return items.map(({ y, width }) => {
    let x = plot.right - TAG_GAP - width;
    for (;;) {
      const covered = placed.find((p) => Math.abs(p.y - y) < ROW && x < p.x1 && x + width > p.x0);
      if (!covered) break;
      x = covered.x0 - TAG_GAP - width;
    }
    const fits = x >= plot.left;
    x = Math.max(plot.left, x);
    placed.push({ x0: x, x1: x + width, y });
    return { x, fits };
  });
}

/**
 * Draw `tags` at the right of the plot, laid out so none covers another,
 * and add their buttons to `buttons`, and the tags that take their line to
 * `boxes`, where they were drawn. A tag that did not fit is drawn first,
 * under the others, with neither: what may lie under another tag can't be
 * pressed.
 */
export function drawTags(
  ctx: CanvasRenderingContext2D,
  tags: readonly TradingTag[],
  viewport: ViewportState,
  theme: Theme,
  buttons: LineButton[],
  boxes: TagBox[] = [],
): void {
  if (tags.length === 0) return;
  const { chartRect } = viewport;
  const widths = tags.map((tag) => tag.cells.map((cell) => cellWidth(ctx, cell, theme)));
  const sums = widths.map((w) => w.reduce((a, b) => a + b, 0));
  const places = layoutTags(
    tags.map((tag, i) => ({ y: tag.y, width: sums[i] })),
    { left: chartRect.x, right: chartRect.x + chartRect.width },
  );
  const order = tags.map((_, i) => i).sort((a, b) => Number(places[a].fits) - Number(places[b].fits));
  for (const i of order) {
    const { x, fits } = places[i];
    const top = tagTop(tags[i].y);
    drawTag(ctx, tags[i], x, top, widths[i], sums[i], theme, fits ? buttons : []);
    const grab = tags[i].grab;
    if (!fits || !grab) continue;
    // Only what shows: the plot clips a tag on a line near its edge.
    const y0 = Math.max(top, chartRect.y);
    const y1 = Math.min(top + TAG_HEIGHT, chartRect.y + chartRect.height);
    if (y1 > y0) boxes.push({ x, y: y0, width: sums[i], height: y1 - y0, lineY: tags[i].y, grab });
  }
}

/**
 * One tag: its ground inside a border in the line's colour, the cells split
 * by hairlines of the same colour, a stamp filled with it.
 */
function drawTag(
  ctx: CanvasRenderingContext2D,
  tag: TradingTag,
  x: number,
  top: number,
  widths: readonly number[],
  width: number,
  theme: Theme,
  buttons: LineButton[],
): void {
  const middle = top + TAG_HEIGHT / 2;
  ctx.save();
  tagPath(ctx, x, top, width, TAG_HEIGHT, theme);
  ctx.clip();
  ctx.fillStyle = theme.background;
  ctx.fillRect(x, top, width, TAG_HEIGHT);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  let at = x;
  tag.cells.forEach((cell, i) => {
    const w = widths[i];
    ctx.fillStyle = tag.color;
    if (cell.kind === 'stamp') ctx.fillRect(at, top, w, TAG_HEIGHT);
    else if (i > 0) ctx.fillRect(at, top, 1, TAG_HEIGHT);
    if (cell.kind === 'button') {
      drawIcon(ctx, cell.icon, at + (w - ICON_SIZE) / 2, top + (TAG_HEIGHT - ICON_SIZE) / 2, ICON_SIZE, theme.text);
      buttons.push({ x: at, y: top, size: TAG_HEIGHT, action: cell.action });
    } else {
      ctx.font = cellFont(cell, theme);
      ctx.fillStyle = cell.kind === 'stamp' ? labelTextColor(tag.color) : cell.color ?? theme.text;
      ctx.fillText(cell.text, at + CELL_PAD, middle);
    }
    at += w;
  });
  // The border last, half a pixel in: it follows a rounded tag's arcs too.
  tagPath(ctx, x + 0.5, top + 0.5, width - 1, TAG_HEIGHT - 1, theme);
  ctx.strokeStyle = tag.color;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

/** A price for the price axis: its line's y, the price as the axis writes it, the line's colour. */
export interface AxisBadge {
  y: number;
  text: string;
  color: string;
}

/**
 * Where badges for lines at `ys` go on the axis so none covers another, each
 * as near its line as the others allow, top to bottom; those that no longer
 * fit above the plot's foot are left out.
 */
export function spreadAxisBadges<T extends { y: number }>(badges: readonly T[], viewport: ViewportState): (T & { at: number })[] {
  const { chartRect } = viewport;
  const bottom = chartRect.y + chartRect.height;
  const sorted = [...badges].sort((a, b) => a.y - b.y);
  const at = spreadLabels(sorted.map((b) => b.y), chartRect.y, bottom, AXIS_LABEL_HEIGHT);
  return sorted.map((b, i) => ({ ...b, at: at[i] })).filter((b) => b.at + AXIS_LABEL_HEIGHT / 2 <= bottom + 0.5);
}

/**
 * A price on the price axis, the axis's width in its line's `color`, its
 * text in the ink that reads on it. Drawn after the axis, over its labels.
 */
export function drawAxisBadge(ctx: CanvasRenderingContext2D, y: number, text: string, color: string, viewport: ViewportState, theme: Theme): void {
  const { chartRect } = viewport;
  const x = chartRect.x + chartRect.width + 1;
  ctx.fillStyle = color;
  fillTag(ctx, x, Math.round(y) - AXIS_LABEL_HEIGHT / 2, (viewport.priceAxisWidth ?? PRICE_AXIS_WIDTH) - 2, AXIS_LABEL_HEIGHT, theme);
  ctx.fillStyle = labelTextColor(color);
  ctx.font = `${theme.font.sizeSmall}px ${theme.font.family}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 5, Math.round(y));
}
