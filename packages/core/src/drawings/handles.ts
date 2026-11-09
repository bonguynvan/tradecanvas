/**
 * A selected drawing's handles, drawn one way for every tool: a ring in the
 * line's colour around the chart's background, a size over the line, bigger
 * under the pointer and filled while dragged. On a drawing whose handles
 * can't be grabbed (another one of a selection, a locked one) they show as
 * small dots.
 */
import type { DrawingState, Point } from '@tradecanvas/commons';
import { withAlpha } from '@tradecanvas/commons';
import { drawingLook, handleRadius } from './drawingLook.js';

/** Which handle the pointer is on, or drags: a drawing's id and the handle's index. */
export interface HandleRef {
  id: string;
  index: number;
}

/** What the pass's handles answer to: the drawing whose handles reshape it, and the handle under the pointer or in hand. */
export interface HandleFocus {
  primary: string | null;
  hover: HandleRef | null;
  drag: HandleRef | null;
}

/** The ring's line, px. */
const RING_WIDTH = 1.5;
/** How much bigger a handle is under the pointer, px. */
const HOVER_GROWTH = 1.5;
/** A side handle (between a box's corners) is this much smaller, px. */
const SIDE_SHRINK = 1;
/** A handle on a drawing that can't be reshaped from it: a dot this size, px. */
const PASSIVE_RADIUS = 2.5;
const PASSIVE_ALPHA = 0.7;
/** The soft ring around a handle in hand, px out from it, and its strength. */
const DRAG_HALO = 4;
const DRAG_HALO_ALPHA = 0.2;

let focus: HandleFocus = { primary: null, hover: null, drag: null };

/**
 * The handles' focus for the next pass; none forgets it. Set by the drawing
 * manager right before each (synchronous) pass.
 */
export function setHandleFocus(next: HandleFocus | null): void {
  focus = next ?? { primary: null, hover: null, drag: null };
}

/** `v` (CSS px) on the middle of a device pixel, so a ring's edge stays sharp. */
function snap(v: number, scale: number, shift: number): number {
  return (Math.round(v * scale + shift - 0.5) + 0.5 - shift) / scale;
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

/**
 * The handles of `state` at `points` (CSS px). `sides` names the indexes of
 * in-between handles, drawn a size smaller.
 */
export function drawAnchorHandles(
  ctx: CanvasRenderingContext2D,
  state: DrawingState,
  points: readonly Point[],
  options: { sides?: ReadonlySet<number> } = {},
): void {
  const look = drawingLook();
  const color = state.style.color;
  const t = ctx.getTransform?.() ?? { a: 1, d: 1, e: 0, f: 0 };
  const active = state.id === focus.primary && !state.locked;
  ctx.save();
  ctx.setLineDash([]);
  points.forEach((p, i) => {
    const x = snap(p.x, t.a || 1, t.e ?? 0);
    const y = snap(p.y, t.d || 1, t.f ?? 0);
    if (!active) {
      circle(ctx, x, y, PASSIVE_RADIUS * look.scale);
      ctx.globalAlpha = PASSIVE_ALPHA;
      ctx.fillStyle = color;
      ctx.fill();
      ctx.globalAlpha = 1;
      return;
    }
    const base = handleRadius(state.style.lineWidth) - (options.sides?.has(i) ? SIDE_SHRINK : 0);
    const dragged = focus.drag?.id === state.id && focus.drag.index === i;
    const hovered = !dragged && focus.hover?.id === state.id && focus.hover.index === i;
    const r = hovered || dragged ? base + HOVER_GROWTH : base;
    if (dragged) {
      circle(ctx, x, y, r + DRAG_HALO);
      ctx.fillStyle = withAlpha(color, DRAG_HALO_ALPHA);
      ctx.fill();
    }
    circle(ctx, x, y, r);
    ctx.fillStyle = dragged ? color : look.handleFill;
    ctx.fill();
    ctx.strokeStyle = dragged ? look.background : color;
    ctx.lineWidth = RING_WIDTH;
    ctx.stroke();
  });
  ctx.restore();
}
