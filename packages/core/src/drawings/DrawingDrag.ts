import type { AnchorPoint, DrawingPlugin, DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { sanitizeDrawingOptions } from '@tradecanvas/commons';
import { barIndexToTime, priceToY, resolveBarIndex, xToTime, yToPrice } from '../viewport/ScaleMapping.js';
import { cloneDrawing } from './drawingState.js';
import { nearestAnchor } from './drawingEditing.js';

/** Pointer travel (px) before pressing a drawing turns into moving it. */
const DRAG_START_PX = 3;

/**
 * What the manager makes of the pointer while it drags: the magnet and the
 * Shift angle. Left out, a handle goes under the pointer and a move follows it.
 */
export interface DragEdit {
  /** Where handle `handle` of `drawing` goes for the pointer at `pos`. */
  handleAt(pos: Point, drawing: DrawingState, handle: number): AnchorPoint;
  /** An anchor moved to here, snapped by the magnet (it is the price that counts). */
  snap(anchor: AnchorPoint): AnchorPoint;
}

interface Grabbed {
  id: string;
  /** Its anchors when the drag began. */
  anchors: AnchorPoint[];
  before: DrawingState;
}

/**
 * Drawings being dragged with the pointer: moved together (a selection), or
 * one reshaped by a handle. Drawings are looked up by id on every move, so
 * an undo or a reload in between leaves nothing stale.
 */
export class DrawingDrag {
  private start: Point | null = null;
  /** The handle being dragged, or -1 while moving. */
  private handle = -1;
  private grabbed: Grabbed[] = [];
  /** The first drawing's anchor nearest the press: the one the magnet pulls on a move. */
  private held = -1;

  constructor(private readonly find: (id: string) => DrawingState | undefined) {}

  isActive(): boolean {
    return this.start !== null;
  }

  /** Grab drawings to move together; the first is the one under the pointer. */
  beginMove(pos: Point, drawings: readonly DrawingState[]): void {
    this.start = pos;
    this.handle = -1;
    this.held = -1;
    this.grabbed = drawings.map((d) => ({ id: d.id, anchors: d.anchors.map((a) => ({ ...a })), before: cloneDrawing(d) }));
  }

  /** Grab handle `handle` of a drawing to reshape it. */
  beginResize(pos: Point, drawing: DrawingState, handle: number): void {
    this.start = pos;
    this.handle = handle;
    this.grabbed = [{ id: drawing.id, anchors: drawing.anchors.map((a) => ({ ...a })), before: cloneDrawing(drawing) }];
  }

  /** Follow the pointer. True when something changed. */
  move(pos: Point, viewport: ViewportState, plugin: DrawingPlugin | undefined, edit?: DragEdit): boolean {
    if (!this.start || this.grabbed.length === 0) return false;
    return this.handle >= 0 ? this.reshape(pos, viewport, plugin, edit) : this.translate(pos, viewport, edit);
  }

  /** Let go: each drawing that changed, with how it was before. */
  end(): { before: DrawingState; drawing: DrawingState }[] {
    const changed = this.grabbed.flatMap(({ id, before }) => {
      const drawing = this.find(id);
      return drawing ? [{ before, drawing }] : [];
    });
    this.start = null;
    this.handle = -1;
    this.grabbed = [];
    return changed;
  }

  /**
   * Move every grabbed drawing by the pointer's travel: whole bars in time
   * (each point keeps its place between bars, and a weekend gap moves like
   * any other bar), and on screen in price (so a log scale keeps the shape).
   * With the magnet, the point nearest the press lands on a price and the
   * rest keep their place to it.
   */
  private translate(pos: Point, viewport: ViewportState, edit?: DragEdit): boolean {
    const start = this.start!;
    const dx = pos.x - start.x;
    let dy = pos.y - start.y;
    // A click that wobbles a pixel or two shouldn't nudge the drawing.
    if (Math.hypot(dx, dy) < DRAG_START_PX && this.unmoved()) return true;
    const barUnit = viewport.barWidth + viewport.barSpacing;
    const bars = barUnit > 0 ? Math.round(dx / barUnit) : 0;
    const snapped = edit ? this.snapHeld(bars, dy, viewport, edit) : null;
    if (snapped) dy += snapped.dy;
    this.grabbed.forEach(({ id, anchors }, i) => {
      const drawing = this.find(id);
      if (!drawing || drawing.locked) return;
      drawing.anchors = shiftAnchors(anchors, bars, dy, viewport);
      // The held point on the price itself, not a hair off it from the pixel round trip.
      if (i === 0 && snapped) drawing.anchors[this.held] = { ...drawing.anchors[this.held], price: snapped.price };
    });
    return true;
  }

  /**
   * The price the magnet puts the held point on, and how many more pixels
   * that moves it; null when the magnet leaves it where it is.
   */
  private snapHeld(bars: number, dy: number, viewport: ViewportState, edit: DragEdit): { price: number; dy: number } | null {
    const first = this.grabbed[0];
    if (this.held < 0) this.held = nearestAnchor(first.anchors, this.start!, viewport);
    const anchor = first.anchors[this.held];
    if (!anchor) return null;
    const [moved] = shiftAnchors([anchor], bars, dy, viewport);
    const { price } = edit.snap(moved);
    if (price === moved.price) return null;
    return { price, dy: priceToY(price, viewport) - priceToY(moved.price, viewport) };
  }

  private unmoved(): boolean {
    return this.grabbed.every(({ id, anchors }) => {
      const now = this.find(id)?.anchors;
      return !now || now.every((a, i) => a.time === anchors[i]?.time && a.price === anchors[i]?.price);
    });
  }

  /** Put the handle under the pointer: an anchor, or what the tool's `moveHandle` makes of it. */
  private reshape(pos: Point, viewport: ViewportState, plugin: DrawingPlugin | undefined, edit?: DragEdit): boolean {
    const drawing = this.find(this.grabbed[0].id);
    if (!drawing) return false;
    const anchor = edit
      ? edit.handleAt(pos, drawing, this.handle)
      : { time: xToTime(pos.x, viewport), price: yToPrice(pos.y, viewport) };
    if (plugin?.moveHandle) {
      const moved = plugin.moveHandle(cloneDrawing(drawing), this.handle, anchor);
      drawing.anchors = moved.anchors;
      drawing.options = moved.options && Object.keys(moved.options).length > 0
        ? sanitizeDrawingOptions(plugin.descriptor.options, moved.options)
        : undefined;
    } else if (this.handle < drawing.anchors.length) {
      drawing.anchors[this.handle] = anchor;
    }
    return true;
  }
}

/**
 * Anchors moved `bars` whole bars in time and `dy` pixels on screen in
 * price: a drag, or an arrow key.
 */
export function shiftAnchors(anchors: readonly AnchorPoint[], bars: number, dy: number, viewport: ViewportState): AnchorPoint[] {
  const data = viewport.data;
  const shiftTime = (time: number) => {
    const index = resolveBarIndex(time, viewport) + bars;
    return data && data.length > 0 ? barIndexToTime(index, data) : index;
  };
  return anchors.map((a) => ({
    time: bars === 0 ? a.time : shiftTime(a.time),
    price: dy === 0 ? a.price : yToPrice(priceToY(a.price, viewport) + dy, viewport),
  }));
}
