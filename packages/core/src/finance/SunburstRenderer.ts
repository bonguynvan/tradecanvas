import type { SunburstNode, SunburstOptions, Theme } from '@tradecanvas/commons';
import { lerpColor, withAlpha } from '@tradecanvas/commons';
import {
  CHART_PAD,
  LABEL_SIZE,
  canvasMeasure,
  drawTooltip,
  fitText,
  fontOf,
  numberFormat,
  percentFormat,
  seriesColor,
  type Measure,
} from './chartKit.js';
import { readableText } from './colorScale.js';

const TOP = -Math.PI / 2;
const FULL = Math.PI * 2;
/** No more rings than this are drawn, however deep the data is, unless more are asked for. */
const DEFAULT_MAX_DEPTH = 4;
const HARD_MAX_DEPTH = 8;
/** Sizes are summed no deeper than this: data that holds itself would never end. */
const MAX_NESTING = 32;
const DEFAULT_HOLE = 0.3;
const MAX_HOLE = 0.9;
/** How much nearer the background each ring out is drawn: a child is its parent's colour, paler. */
const RING_FADE = 0.22;
const MAX_FADE = 0.66;
const HOVER_TINT = 0.16;
/** Room around a part's name on it, px. */
const LABEL_ROOM = 8;
/** How far into the lower half an arc's middle is before its name is turned over: the sine of its angle. */
const UPRIGHT = 1e-9;
/** A part narrower than this at its rim, px, has no hairline round it: the line would be all of it. */
const MIN_SEPARATED = 4;
/**
 * The width a name may have on an arc, px. It is written straight, along
 * the ring at the arc's middle: no longer than the arc, and no longer than
 * the chord a straight text has of a curved ring before its ends leave it.
 */
function labelRoom(arc: SunburstArc, middle: number, ring: number): number {
  const slack = (ring - LABEL_SIZE) / 2;
  if (slack <= 0) return 0;
  const chord = 2 * Math.sqrt(Math.max(0, middle * middle - (middle - slack) ** 2));
  return Math.min((arc.end - arc.start) * middle, chord) - LABEL_ROOM;
}

/** The hole takes its texts when it is at least this wide, px. */
const MIN_CENTER = 56;

export interface SunburstArc {
  node: SunburstNode;
  /** The labels from the first ring down to this part. */
  path: string[];
  /** 0 for the first ring. */
  depth: number;
  value: number;
  /** Its share of the whole. */
  share: number;
  start: number;
  end: number;
  /** Its own colour, or the one it has from the part it is in. */
  color: string;
}

export interface SunburstLayout {
  cx: number;
  cy: number;
  radius: number;
  /** The hole's radius, and how thick a ring is. */
  inner: number;
  ring: number;
  /** How many rings are drawn. */
  levels: number;
  total: number;
  /** Parent before child, clockwise. */
  arcs: SunburstArc[];
}

/**
 * Every part's size, worked out once: its children's together when they
 * have any, else its own value. A part met again inside itself counts for
 * nothing there, so data that holds itself still ends.
 */
function sizesOf(nodes: readonly SunburstNode[]): Map<SunburstNode, number> {
  const known = new Map<SunburstNode, number>();
  const open = new Set<SunburstNode>();
  const sizeOf = (node: SunburstNode, nesting: number): number => {
    const done = known.get(node);
    if (done !== undefined) return done;
    if (open.has(node)) return 0;
    open.add(node);
    let inside = 0;
    if (nesting < MAX_NESTING) for (const child of node.children ?? []) inside += sizeOf(child, nesting + 1);
    open.delete(node);
    const own = typeof node.value === 'number' && Number.isFinite(node.value) && node.value > 0 ? node.value : 0;
    const size = inside > 0 ? inside : own;
    known.set(node, size);
    return size;
  };
  for (const node of nodes) sizeOf(node, 0);
  return known;
}

/** How many rings the data fills, `most` at most. */
function depthOf(nodes: readonly SunburstNode[], sizes: Map<SunburstNode, number>, most: number, above: Set<SunburstNode>): number {
  if (most <= 0) return 0;
  let deepest = -1;
  for (const node of nodes) {
    if (!((sizes.get(node) ?? 0) > 0) || above.has(node)) continue;
    above.add(node);
    deepest = Math.max(deepest, depthOf(node.children ?? [], sizes, most - 1, above));
    above.delete(node);
    // As deep as is drawn: the rest cannot add a ring.
    if (deepest >= most - 1) break;
  }
  return deepest + 1;
}

/** The parts as arcs of rings around a hole, for a chart `width` × `height`. */
export function computeSunburstLayout(options: SunburstOptions, width: number, height: number, _theme: Theme, _measure: Measure): SunburstLayout {
  const asked = options.maxDepth;
  const most = typeof asked === 'number' && Number.isFinite(asked) && asked >= 1 ? Math.min(HARD_MAX_DEPTH, Math.floor(asked)) : DEFAULT_MAX_DEPTH;
  const sizes = sizesOf(options.data);
  const levels = depthOf(options.data, sizes, most, new Set());
  const total = options.data.reduce((sum, node) => sum + (sizes.get(node) ?? 0), 0);
  const radius = Math.max(0, Math.min(width, height) / 2 - CHART_PAD);
  const hole = options.innerRadius;
  const inner = radius * Math.min(MAX_HOLE, Math.max(0, typeof hole === 'number' && Number.isFinite(hole) ? hole : DEFAULT_HOLE));
  const arcs: SunburstArc[] = [];

  const above = new Set<SunburstNode>();
  const place = (nodes: readonly SunburstNode[], from: number, depth: number, path: readonly string[], inherited: string | null): void => {
    let angle = from;
    nodes.forEach((node, i) => {
      const value = sizes.get(node) ?? 0;
      if (value <= 0 || above.has(node)) return;
      const start = angle;
      angle += (value / total) * FULL;
      // By its place among its siblings: a part keeps its colour when one before it has no size.
      const color = node.color ?? inherited ?? seriesColor(i);
      const own = [...path, node.label];
      arcs.push({ node, path: own, depth, value, share: value / total, start, end: angle, color });
      if (depth + 1 >= levels) return;
      above.add(node);
      place(node.children ?? [], start, depth + 1, own, color);
      above.delete(node);
    });
  };
  // Sizes too large to add up have no shares.
  if (Number.isFinite(total) && total > 0 && levels > 0) place(options.data, TOP, 0, [], null);

  return { cx: width / 2, cy: height / 2, radius, inner, ring: levels > 0 ? (radius - inner) / levels : 0, levels, total: Number.isFinite(total) ? total : 0, arcs };
}

/** The part under (x, y): on its ring, within its angle. Null in the hole, outside, or where a ring has nothing. */
export function hitSunburstArc(layout: SunburstLayout, x: number, y: number): SunburstArc | null {
  const { cx, cy, inner, ring, levels } = layout;
  if (ring <= 0) return null;
  const dist = Math.hypot(x - cx, y - cy);
  const depth = Math.floor((dist - inner) / ring);
  if (dist < inner || depth >= levels) return null;
  let angle = Math.atan2(y - cy, x - cx);
  while (angle < TOP) angle += FULL;
  return layout.arcs.find((arc) => arc.depth === depth && angle >= arc.start && angle < arc.end) ?? null;
}

/** The colour a part is drawn in: its own on the first ring, paler each ring out. */
function shade(arc: SunburstArc, theme: Theme): string {
  return arc.depth === 0 ? arc.color : lerpColor(arc.color, theme.background, Math.min(MAX_FADE, arc.depth * RING_FADE));
}

function drawCenter(ctx: CanvasRenderingContext2D, layout: SunburstLayout, options: SunburstOptions, theme: Theme, measure: Measure): void {
  const room = layout.inner * 2 - LABEL_ROOM * 2;
  if (room < MIN_CENTER - LABEL_ROOM * 2 || (!options.centerLabel && !options.centerValue)) return;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const both = options.centerLabel && options.centerValue;
  if (options.centerLabel) {
    ctx.font = fontOf(theme, LABEL_SIZE);
    ctx.fillStyle = theme.textSecondary;
    ctx.fillText(fitText(options.centerLabel, room, measure), layout.cx, layout.cy - (both ? LABEL_SIZE * 0.8 : 0));
  }
  if (options.centerValue) {
    const size = LABEL_SIZE + 5;
    ctx.font = fontOf(theme, size, '600');
    ctx.fillStyle = theme.text;
    ctx.fillText(fitText(options.centerValue, room, (text) => measure(text, size)), layout.cx, layout.cy + (both ? LABEL_SIZE * 0.7 : 0));
  }
}

export function renderSunburst(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: SunburstOptions,
  theme: Theme,
  pointer: { x: number; y: number } | null,
  layout: SunburstLayout = computeSunburstLayout(options, width, height, theme, canvasMeasure(ctx, theme)),
): SunburstLayout {
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, width, height);
  if (layout.arcs.length === 0) return layout;

  const measure = canvasMeasure(ctx, theme);
  const format = options.valueFormat ?? numberFormat(options.locale);
  const { cx, cy, inner, ring } = layout;
  const hovered = pointer && options.crosshair !== false ? hitSunburstArc(layout, pointer.x, pointer.y) : null;

  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = theme.background;
  for (const arc of layout.arcs) {
    const r0 = inner + ring * arc.depth;
    ctx.beginPath();
    ctx.arc(cx, cy, r0 + ring, arc.start, arc.end);
    if (r0 > 0) ctx.arc(cx, cy, r0, arc.end, arc.start, true);
    else ctx.lineTo(cx, cy);
    ctx.closePath();
    ctx.fillStyle = shade(arc, theme);
    ctx.fill();
    if (arc === hovered) {
      ctx.fillStyle = withAlpha(theme.text, HOVER_TINT);
      ctx.fill();
    }
    // A hairline of the background between neighbours.
    if ((arc.end - arc.start) * (r0 + ring) >= MIN_SEPARATED) ctx.stroke();
  }

  if (options.showLabels !== false) {
    ctx.font = fontOf(theme, LABEL_SIZE);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const arc of layout.arcs) {
      const middle = inner + ring * (arc.depth + 0.5);
      const room = labelRoom(arc, middle, ring);
      const text = room > LABEL_SIZE * 2 ? fitText(arc.node.label, room, measure) : '';
      if (!text) continue;
      const angle = (arc.start + arc.end) / 2;
      // Along the ring, and turned over in the lower half: never upside down.
      const along = angle + Math.PI / 2;
      ctx.save();
      ctx.translate(cx + Math.cos(angle) * middle, cy + Math.sin(angle) * middle);
      ctx.rotate(Math.sin(angle) > UPRIGHT ? along - Math.PI : along);
      ctx.fillStyle = readableText(shade(arc, theme));
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
  }
  drawCenter(ctx, layout, options, theme, measure);
  ctx.restore();

  if (hovered && pointer) {
    drawTooltip(ctx, [
      { text: hovered.path.join(' / '), bold: true, color: shade(hovered, theme) },
      { text: `${format(hovered.value)} · ${percentFormat(options.locale)(hovered.share)}` },
    ], pointer, { x: 0, y: 0, width, height }, theme);
  }
  return layout;
}
