import type { DrawingOptionDefs, DrawingOptionValue, DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { barsBetween, drawLabelBox, drawingHandleFill, formatPriceChange, spanBetween } from './labels.js';
import { screenAngleDeg } from './TrendAngle.js';

/** An arrowhead's length (px), as the arrow tool draws it. */
const ARROW_HEAD = 12;
/** The middle point's radius (px). */
const MIDDLE_RADIUS = 3.5;
/** How far the stats box sits from the end or the middle it is by (px). */
const STATS_GAP = 8;

const END_CHOICES = [{ value: 'normal', label: 'Normal' }, { value: 'arrow', label: 'Arrow' }];

/** A straight line's ends: plain, or an arrowhead. Left is the first point's end, right the second's. */
export const LINE_END_OPTIONS: DrawingOptionDefs = {
  leftEnd: { kind: 'choice', label: 'Left end', default: 'normal', choices: END_CHOICES },
  rightEnd: { kind: 'choice', label: 'Right end', default: 'normal', choices: END_CHOICES },
};

/**
 * What a straight line shows besides itself: its middle point, and stats
 * between its two points (the price's change, the bars and the time spanned,
 * the angle) while it is selected, or all the time.
 */
export const LINE_STATS_OPTIONS: DrawingOptionDefs = {
  showMiddlePoint: { kind: 'boolean', label: 'Show middle point', default: false },
  showPriceRange: { kind: 'boolean', label: 'Show price range', default: false },
  showBarsRange: { kind: 'boolean', label: 'Show bars range', default: false },
  showDateRange: { kind: 'boolean', label: 'Show date and time range', default: false },
  showAngle: { kind: 'boolean', label: 'Show angle', default: false },
  alwaysShowStats: { kind: 'boolean', label: 'Always show stats', default: false },
  statsPosition: {
    kind: 'choice',
    label: 'Stats position',
    default: 'right',
    choices: [{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }],
  },
};

/** One of the drawing's options, its default when unset (a tool's `option`). */
export type OptionReader = <T extends DrawingOptionValue>(key: string) => T;

/** A filled arrowhead at `tip`, pointing away from `from` (the freehand tools draw an open one). */
export function fillArrowHead(ctx: CanvasRenderingContext2D, from: Point, tip: Point, color: string): void {
  const angle = Math.atan2(tip.y - from.y, tip.x - from.x);
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(tip.x - ARROW_HEAD * Math.cos(angle - Math.PI / 6), tip.y - ARROW_HEAD * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(tip.x - ARROW_HEAD * Math.cos(angle + Math.PI / 6), tip.y - ARROW_HEAD * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

/** Arrowheads on the ends of the drawn line `segment` that ask for one. */
export function drawLineEnds(ctx: CanvasRenderingContext2D, segment: readonly [Point, Point], color: string, option: OptionReader): void {
  const [start, end] = segment;
  if (start.x === end.x && start.y === end.y) return;
  if (option<string>('leftEnd') === 'arrow') fillArrowHead(ctx, end, start, color);
  if (option<string>('rightEnd') === 'arrow') fillArrowHead(ctx, start, end, color);
}

/** The stats asked for, between the drawing's first two points (`a` and `b` on screen). */
export function lineStatsText(state: DrawingState, viewport: ViewportState, a: Point, b: Point, option: OptionReader): string[] {
  const lines: string[] = [];
  if (option<boolean>('showPriceRange')) lines.push(formatPriceChange(state.anchors[0].price, state.anchors[1].price, viewport));
  if (option<boolean>('showBarsRange')) lines.push(`${barsBetween(state, 0, 1, viewport)} bars`);
  const span = option<boolean>('showDateRange') ? spanBetween(state, 0, 1, viewport) : null;
  if (span) lines.push(span);
  if (option<boolean>('showAngle')) lines.push(`${screenAngleDeg(a, b).toFixed(1)}°`);
  return lines;
}

/**
 * The line's middle point when asked for, and its stats while it is selected
 * (or always): by its right end, its middle or its left end, above the line
 * where it rises to that end and below where it falls.
 */
export function drawLineStats(
  ctx: CanvasRenderingContext2D,
  state: DrawingState,
  viewport: ViewportState,
  [a, b]: readonly [Point, Point],
  selected: boolean,
  option: OptionReader,
): void {
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  if (option<boolean>('showMiddlePoint')) {
    ctx.beginPath();
    ctx.arc(mid.x, mid.y, MIDDLE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = drawingHandleFill();
    ctx.fill();
    ctx.strokeStyle = state.style.color;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  if (!selected && !option<boolean>('alwaysShowStats')) return;
  const lines = lineStatsText(state, viewport, a, b, option);
  if (lines.length === 0) return;
  const [left, right] = a.x <= b.x ? [a, b] : [b, a];
  const position = option<string>('statsPosition');
  if (position === 'center') {
    drawLabelBox(ctx, lines, mid.x, mid.y - STATS_GAP, 'center', true);
    return;
  }
  const [end, other] = position === 'left' ? [left, right] : [right, left];
  const above = end.y <= other.y;
  const x = position === 'left' ? end.x - STATS_GAP : end.x + STATS_GAP;
  drawLabelBox(ctx, lines, x, end.y + (above ? -STATS_GAP : STATS_GAP), position === 'left' ? 'right' : 'left', above);
}
