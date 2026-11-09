/**
 * Labels of the tools drawn through turning points (harmonic patterns, head
 * and shoulders, Elliott waves): a name by each point, outside it, and a
 * figure on each of the dashed guides between points, each kept clear of the
 * handles and of the other labels.
 */
import type { DrawingState, Point } from '@tradecanvas/commons';
import { drawingLook, extendExtent, handleRadius, keepOnPlot, readableText, roleFont } from '../drawingLook.js';
import { clearSpot, fillTextWithHalo, takeLabelBox, type LabelBox } from './labels.js';

/** Which side of its point a label goes. */
export type VertexSide = 'above' | 'below';

/** A point's name, with a short form for where the full one would meet another. */
export interface VertexMark {
  text: string;
  /** Written instead of `text` when the full names would print over each other. */
  short?: string;
  /** Placed before the others, so it is the one kept when there is room for only one. */
  first?: boolean;
  /** Drawn inside a ring of its own (a wave degree's circled figure). */
  ring?: boolean;
}

/**
 * How far past a handle's ring a label keeps, px: the ring grows 1.5 px under
 * the pointer, and the rest is air so the label doesn't read as touching it.
 */
const VERTEX_GAP = 5;
/** How far a ring sits out from its figure, px. */
const RING_PAD = 3;
/** The ring's line, px. */
const RING_WIDTH = 1.25;
/** A handle as big as it gets: the ring grows this much under the pointer, px. */
const HANDLE_HOVER = 1.5;
/** Where along its guide a ratio is tried, its middle first, then out toward either end. */
const RATIO_SPOTS = [0.5, 0.38, 0.62, 0.26, 0.74, 0.15, 0.85];
/** Room a ratio keeps beside what is already placed, px: two ratios side by side read as one number without it. */
const RATIO_CLEARANCE = 8;
/** How far off its guide a ratio moves when every spot on the line is taken, past its own half height, px. */
const RATIO_OFF_LINE = 3;

/**
 * The side of point `i` its label goes: above a peak, below a trough. A point
 * part way along a run goes to the side its neighbours' chord leaves open; an
 * end, by its one neighbour.
 */
export function vertexSide(pts: readonly Point[], i: number): VertexSide {
  const prev = pts[i - 1];
  const next = pts[i + 1];
  const p = pts[i];
  if (!prev && !next) return 'above';
  if (!prev || !next) return p.y <= (prev ?? next).y ? 'above' : 'below';
  return p.y <= (prev.y + next.y) / 2 ? 'above' : 'below';
}

/** How far a label sits from its point's centre, px: past its handle, selected or not. */
export function vertexOffset(lineWidth: number): number {
  return handleRadius(lineWidth) + VERTEX_GAP;
}

/** The box of a label `width` × `height` centred over (or under) point `p`, kept on the plot. */
function boxBy(p: Point, side: VertexSide, width: number, height: number, offset: number): LabelBox {
  const top = side === 'above' ? p.y - offset - height : p.y + offset;
  return { left: p.x - width / 2, right: p.x + width / 2, top, bottom: top + height };
}

/**
 * A label's box by point `i`: on its side, or the other where the plot's edge
 * would cut it off (moving it in would put it on the handle).
 */
function vertexBox(pts: readonly Point[], i: number, width: number, height: number, offset: number): LabelBox {
  const side = vertexSide(pts, i);
  const box = boxBy(pts[i], side, width, height, offset);
  if (keepOnPlot(box.left, box.top, width, height).top === box.top) return box;
  return boxBy(pts[i], side === 'above' ? 'below' : 'above', width, height, offset);
}

function meets(a: LabelBox, b: LabelBox): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

/** A mark's size in the current font: its text's, or its ring's square. */
function markSize(ctx: CanvasRenderingContext2D, text: string, ring: boolean, height: number): { width: number; height: number } {
  const width = ctx.measureText(text).width;
  if (!ring) return { width, height };
  const side = 2 * ringRadius(width, height);
  return { width: side, height: side };
}

function ringRadius(textWidth: number, height: number): number {
  return Math.max(textWidth, height) / 2 + RING_PAD;
}

/** Where each mark goes and what it says: a label's box, or null where it is left out. */
interface PlacedMark {
  text: string;
  ring: boolean;
  box: LabelBox;
}

/**
 * The marks' boxes: full names while none of them meet, else the short forms;
 * then any still meeting one placed before it (the `first` ones placed first) is left out.
 */
function placeMarks(
  ctx: CanvasRenderingContext2D,
  pts: readonly Point[],
  marks: readonly VertexMark[],
  height: number,
  offset: number,
): PlacedMark[] {
  const lay = (short: boolean) => marks.slice(0, pts.length).map((m, i) => {
    const text = short && m.short ? m.short : m.text;
    const size = markSize(ctx, text, !!m.ring, height);
    return { text, ring: !!m.ring, first: !!m.first, box: vertexBox(pts, i, size.width, size.height, offset) };
  }).filter((m) => m.text);
  const full = lay(false);
  const clash = full.some((a, i) => full.slice(i + 1).some((b) => meets(a.box, b.box)));
  const laid = clash ? lay(true) : full;
  const order = [...laid.filter((m) => m.first), ...laid.filter((m) => !m.first)];
  const kept: typeof laid = [];
  for (const m of order) if (kept.every((k) => !meets(k.box, m.box))) kept.push(m);
  return laid.filter((m) => kept.includes(m));
}

/**
 * The names of a drawing's points, in the current font and `height` px tall:
 * each centred outside its point, past its handle, in the drawing's colour on
 * a halo. Returns the boxes drawn, for the labels after them to keep clear of.
 */
export function drawVertexLabels(
  ctx: CanvasRenderingContext2D,
  state: DrawingState,
  pts: readonly Point[],
  marks: readonly VertexMark[],
  height: number,
): LabelBox[] {
  const placed = placeMarks(ctx, pts, marks, height, vertexOffset(state.style.lineWidth));
  const ink = readableText(state.style.color);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const m of placed) {
    const cx = (m.box.left + m.box.right) / 2;
    const cy = (m.box.top + m.box.bottom) / 2;
    if (m.ring) strokeRing(ctx, cx, cy, (m.box.right - m.box.left) / 2, state.style.color);
    ctx.fillStyle = ink;
    fillTextWithHalo(ctx, m.text, cx, cy);
    noteBox(m.box);
  }
  return placed.map((m) => m.box);
}

/** A ring round a figure: on the chart's background, so the line under it doesn't cross the figure. */
function strokeRing(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  // Its own line and fill, given back after: the strokes drawn later in the pass (the handles) set theirs from what they find.
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = drawingLook().background;
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = RING_WIDTH;
  ctx.setLineDash([]);
  ctx.stroke();
  ctx.restore();
}

/** Note a label's box for the drawing's extent and for the labels drawn after it in the pass. */
function noteBox(b: LabelBox): void {
  extendExtent(b.left, b.top, b.right - b.left, b.bottom - b.top);
  takeLabelBox(b.left, b.top, b.right, b.bottom);
}

/** The boxes a drawing's handles take at their biggest, for labels to keep clear of. */
export function handleBoxes(pts: readonly Point[], lineWidth: number): LabelBox[] {
  const r = handleRadius(lineWidth) + HANDLE_HOVER;
  return pts.map((p) => ({ left: p.x - r, right: p.x + r, top: p.y - r, bottom: p.y + r }));
}

/**
 * A ratio on the guide from `p` to `q`, in the mark size and the current
 * colour, on a halo: at the guide's middle, or moved along it to the first
 * spot clear of `placed` (handles, names, other ratios) and of the legend.
 * Left out where no spot is clear. Returns its box, or null.
 */
export function drawGuideRatio(
  ctx: CanvasRenderingContext2D,
  text: string,
  p: Point,
  q: Point,
  placed: readonly LabelBox[],
): LabelBox | null {
  ctx.font = roleFont('mark');
  const width = ctx.measureText(text).width;
  const height = drawingLook().sizes.mark;
  // On the line first, then just under it, then just over it: moved, a ratio still reads as its guide's; left out, it is lost.
  const off = height + RATIO_OFF_LINE;
  const spots = [0, off, -off].flatMap((dy) => RATIO_SPOTS.map((t) => {
    const x = p.x + (q.x - p.x) * t;
    const y = p.y + (q.y - p.y) * t + dy;
    return { left: x - width / 2, right: x + width / 2, top: y - height / 2, bottom: y + height / 2 };
  }));
  // Tried with room either side, so it keeps clear of a neighbour by that much.
  const roomy = spots.map((b) => ({ ...b, left: b.left - RATIO_CLEARANCE, right: b.right + RATIO_CLEARANCE }));
  const found = clearSpot(roomy, placed);
  if (!found) return null;
  const spot = spots[roomy.indexOf(found)];
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fillTextWithHalo(ctx, text, (spot.left + spot.right) / 2, (spot.top + spot.bottom) / 2);
  noteBox(spot);
  return spot;
}
