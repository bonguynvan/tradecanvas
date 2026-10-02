import type { AnchorPoint, DrawingPlugin, DrawingState, Point } from '@tradecanvas/commons';

/** What a press, move or release did to the drawing being made. */
export type CreationStep = 'continue' | 'done' | 'cancel';

/** Pointer travel (px) between two points of a freehand stroke. */
const FREEHAND_STEP_PX = 2;
/** A click this close (px) to a path's last point ends the path (a double-click does this). */
const SAME_POINT_PX = 6;
/** Most points a freehand stroke keeps. */
export const MAX_FREEHAND_POINTS = 2000;
/** Most points a path takes unless its tool says otherwise. */
export const MAX_PATH_POINTS = 100;

function creationMode(plugin: DrawingPlugin): 'clicks' | 'freehand' | 'path' {
  return plugin.descriptor.creation ?? 'clicks';
}

/**
 * The drawing being made with the pointer, for each way a tool is drawn
 * (`DrawingDescriptor.creation`):
 * - clicks: a click per anchor until it has `requiredAnchors`;
 * - freehand: press and drag, a point every few pixels, release to finish;
 * - path: a click per point; a double-click, Enter or a click on the last
 *   point finishes it.
 */
export class DrawingCreator {
  private drawing: DrawingState | null = null;
  private plugin: DrawingPlugin | null = null;
  private preview: AnchorPoint | null = null;
  private lastPos: Point | null = null;
  private dragging = false;

  /** The drawing being made (its committed anchors), or null. */
  get current(): DrawingState | null {
    return this.drawing;
  }

  reset(): void {
    this.drawing = null;
    this.plugin = null;
    this.preview = null;
    this.lastPos = null;
    this.dragging = false;
  }

  /** A press at `anchor` (at `pos` on screen). `start` makes the drawing on the first one. */
  press(plugin: DrawingPlugin, start: () => DrawingState, anchor: AnchorPoint, pos: Point): CreationStep {
    const mode = creationMode(plugin);
    if (!this.drawing) {
      this.plugin = plugin;
      this.drawing = { ...start(), anchors: [anchor] };
      this.preview = null;
      this.lastPos = pos;
      if (mode === 'freehand') {
        this.dragging = true;
        return 'continue';
      }
      return mode === 'clicks' && plugin.descriptor.requiredAnchors <= 1 ? 'done' : 'continue';
    }
    if (mode === 'path' && this.lastPos && Math.hypot(pos.x - this.lastPos.x, pos.y - this.lastPos.y) <= SAME_POINT_PX) {
      return this.finish();
    }
    this.commit(anchor, pos);
    const most = mode === 'path' ? plugin.descriptor.maxAnchors ?? MAX_PATH_POINTS : plugin.descriptor.requiredAnchors;
    return this.drawing.anchors.length >= most ? 'done' : 'continue';
  }

  /** The pointer moved: a freehand stroke takes a point, others show where the next anchor would go. */
  move(anchor: AnchorPoint, pos: Point): boolean {
    if (!this.drawing || !this.plugin) return false;
    if (this.dragging) {
      const last = this.lastPos;
      if (last && Math.hypot(pos.x - last.x, pos.y - last.y) < FREEHAND_STEP_PX) return true;
      if (this.drawing.anchors.length < MAX_FREEHAND_POINTS) this.commit(anchor, pos);
      return true;
    }
    if (creationMode(this.plugin) === 'path' || this.drawing.anchors.length < this.plugin.descriptor.requiredAnchors) {
      this.preview = anchor;
      return true;
    }
    return false;
  }

  /** The press ended: a freehand stroke is done (or dropped, when it never moved). */
  release(): CreationStep | null {
    if (!this.dragging) return null;
    this.dragging = false;
    return this.hasEnough() ? 'done' : 'cancel';
  }

  /** End a path here (Enter, or a double-click): done when it has enough points. */
  finish(): CreationStep {
    if (!this.plugin || creationMode(this.plugin) !== 'path') return 'continue';
    if (!this.hasEnough()) return 'continue';
    this.preview = null;
    return 'done';
  }

  /** The drawing as shown while it is made: its anchors, and the one under the pointer. */
  previewState(): DrawingState | null {
    if (!this.drawing) return null;
    return this.preview
      ? { ...this.drawing, anchors: [...this.drawing.anchors, this.preview] }
      : this.drawing;
  }

  /** Take the finished drawing; the creator is empty after. */
  take(): DrawingState | null {
    const drawing = this.drawing;
    this.reset();
    return drawing;
  }

  private hasEnough(): boolean {
    return !!this.drawing && !!this.plugin && this.drawing.anchors.length >= Math.max(2, this.plugin.descriptor.requiredAnchors);
  }

  private commit(anchor: AnchorPoint, pos: Point): void {
    this.drawing!.anchors.push(anchor);
    this.preview = null;
    this.lastPos = pos;
  }
}
