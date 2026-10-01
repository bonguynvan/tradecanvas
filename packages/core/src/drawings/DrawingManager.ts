import type {
  DrawingPlugin,
  DrawingState,
  DrawingToolType,
  DrawingStyle,
  Point,
  ViewportState,
  OHLCBar,
  AnchorPoint,
} from '@tradecanvas/commons';
import { priceToY, timeToX, timestampToBarIndex, xToTime, yToPrice } from '../viewport/ScaleMapping.js';
import type { UndoRedoManager } from '../features/UndoRedoManager.js';

type DrawingEventCallback = (event: string, data: unknown) => void;

export type DrawingInteractionState = 'idle' | 'creating' | 'selected' | 'moving' | 'resizing';
export type MagnetMode = 'none' | 'magnet';

let nextDrawingId = 1;

/**
 * Shallow clone tailored for DrawingState. Avoids `structuredClone` in hot
 * paths (drag, resize, duplicate) where the well-known shape lets us spread
 * much faster than the structured-clone algorithm.
 */
function cloneDrawing(d: DrawingState): DrawingState {
  return {
    ...d,
    anchors: d.anchors.map((a) => ({ ...a })),
    style: { ...d.style },
    meta: d.meta ? { ...d.meta } : undefined,
  };
}

/** Pointer travel (px) before pressing a drawing turns into moving it. */
const DRAG_START_PX = 3;

function sameAnchors(a: readonly AnchorPoint[], b: readonly AnchorPoint[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].time !== b[i].time || a[i].price !== b[i].price) return false;
  }
  return true;
}

export class DrawingManager {
  private registry = new Map<DrawingToolType, DrawingPlugin>();
  private drawings: DrawingState[] = [];
  private state: DrawingInteractionState = 'idle';
  private activeTool: DrawingToolType | null = null;
  private activeStyle: DrawingStyle = {
    color: '#4c8dff',
    lineWidth: 1,
    lineStyle: 'solid',
    fillColor: 'rgba(76, 141, 255, 0.1)',
    fillOpacity: 0.1,
    fontSize: 12,
  };
  private creatingDrawing: DrawingState | null = null;
  private committedAnchors = 0; // how many anchors have been clicked (not preview)
  private previewAnchor: { time: number; price: number } | null = null;
  private selectedDrawingId: string | null = null;
  /** Drawings selected together with `selectedDrawingId` (Ctrl/⌘-drag or Ctrl/⌘-click). */
  private groupIds = new Set<string>();
  /** Start state of the other group members while the group is dragged. */
  private groupDrag: { id: string; anchors: AnchorPoint[]; before: DrawingState }[] = [];
  private dragAnchorIndex = -1;
  private dragStartPoint: Point | null = null;
  private dragStartAnchors: { time: number; price: number }[] = [];
  private dragBeforeState: DrawingState | null = null;
  private eventCallback: DrawingEventCallback | null = null;
  private requestRender: (() => void) | null = null;
  private undoRedo: UndoRedoManager | null = null;
  private magnetMode: MagnetMode = 'none';
  private dataGetter: (() => OHLCBar[]) | null = null;
  private displayDataGetter: (() => OHLCBar[]) | null = null;

  register(plugin: DrawingPlugin): void {
    this.registry.set(plugin.descriptor.type, plugin);
  }

  setEventCallback(cb: DrawingEventCallback): void {
    this.eventCallback = cb;
  }

  setRequestRender(cb: () => void): void {
    this.requestRender = cb;
  }

  setUndoRedoManager(mgr: UndoRedoManager): void {
    this.undoRedo = mgr;
  }

  setMagnetMode(mode: MagnetMode): void {
    this.magnetMode = mode;
  }

  getMagnetMode(): MagnetMode {
    return this.magnetMode;
  }

  setDataGetter(getter: () => OHLCBar[]): void {
    this.dataGetter = getter;
  }

  /** Set a separate getter for display data (e.g. Heikin Ashi transformed). Used by magnet snap. */
  setDisplayDataGetter(getter: () => OHLCBar[]): void {
    this.displayDataGetter = getter;
  }

  // --- Magnet snap ---

  /**
   * Snap an in-progress anchor to the closest OHLC value of the underlying
   * bar. `time` is interpreted as a timestamp when `viewport.data` is set
   * (the modern, recommended mode) or as a bar index otherwise. The returned
   * `time` matches the input convention so the caller doesn't need to know.
   */
  private snapToOHLC(time: number, price: number, viewport?: ViewportState): { time: number; price: number } {
    if (this.magnetMode === 'none' || !this.dataGetter) {
      return { time, price };
    }
    // Use display data for magnet snap (matches what's visually rendered, e.g. Heikin Ashi)
    const data = this.displayDataGetter?.() ?? this.dataGetter();
    if (data.length === 0) return { time, price };

    const useTimestamps = !!(viewport?.data && viewport.data.length > 0);
    const rawIdx = Math.round(useTimestamps ? timestampToBarIndex(time, data) : time);
    // Past either end there is no bar to snap to — keep the point where it
    // was placed (e.g. a target drawn into the empty future).
    if (rawIdx < 0 || rawIdx > data.length - 1) return { time, price };
    const idx = rawIdx;
    const bar = data[idx];

    // Find closest OHLC value
    const candidates = [bar.open, bar.high, bar.low, bar.close];
    let closest = candidates[0];
    let minDist = Math.abs(price - closest);
    for (let i = 1; i < candidates.length; i++) {
      const d = Math.abs(price - candidates[i]);
      if (d < minDist) { minDist = d; closest = candidates[i]; }
    }

    // Only snap if within a reasonable pixel distance (magnet radius)
    if (viewport) {
      const pxPerPrice = viewport.chartRect.height / (viewport.priceRange.max - viewport.priceRange.min || 1);
      const distPx = minDist * pxPerPrice;
      if (distPx > 30) {
        // Too far — don't snap, use the raw input position (bar-aligned).
        return { time: useTimestamps ? bar.time : idx, price };
      }
    }

    return { time: useTimestamps ? bar.time : idx, price: closest };
  }

  // --- Undo / Redo ---

  undo(): boolean {
    if (!this.undoRedo) return false;
    const action = this.undoRedo.undo();
    if (!action) return false;
    this.applyUndoAction(action);
    return true;
  }

  redo(): boolean {
    if (!this.undoRedo) return false;
    const action = this.undoRedo.redo();
    if (!action) return false;
    this.applyRedoAction(action);
    return true;
  }

  private applyUndoAction(action: import('../features/UndoRedoManager.js').UndoableAction): void {
    this.undoOne(action);
    this.clearSelection();
    this.state = 'idle';
    this.requestRender?.();
  }

  private undoOne(action: import('../features/UndoRedoManager.js').UndoableAction): void {
    switch (action.type) {
      case 'drawingBatch':
        for (const a of [...(action.actions ?? [])].reverse()) this.undoOne(a);
        break;
      case 'drawingCreate':
        // Undo create = remove
        if (action.after) {
          this.drawings = this.drawings.filter(d => d.id !== action.after!.id);
        }
        break;
      case 'drawingRemove':
        // Undo remove = restore
        if (action.before) {
          this.drawings.push(action.before);
        }
        break;
      case 'drawingModify':
        // Undo modify = restore before state
        if (action.before) {
          const idx = this.drawings.findIndex(d => d.id === action.before!.id);
          if (idx >= 0) this.drawings[idx] = structuredClone(action.before);
        }
        break;
    }
  }

  private applyRedoAction(action: import('../features/UndoRedoManager.js').UndoableAction): void {
    this.redoOne(action);
    this.clearSelection();
    this.state = 'idle';
    this.requestRender?.();
  }

  private redoOne(action: import('../features/UndoRedoManager.js').UndoableAction): void {
    switch (action.type) {
      case 'drawingBatch':
        for (const a of action.actions ?? []) this.redoOne(a);
        break;
      case 'drawingCreate':
        // Redo create = add again
        if (action.after) {
          this.drawings.push(structuredClone(action.after));
        }
        break;
      case 'drawingRemove':
        // Redo remove = remove again
        if (action.before) {
          this.drawings = this.drawings.filter(d => d.id !== action.before!.id);
        }
        break;
      case 'drawingModify':
        // Redo modify = apply after state
        if (action.after) {
          const idx = this.drawings.findIndex(d => d.id === action.after!.id);
          if (idx >= 0) this.drawings[idx] = structuredClone(action.after);
        }
        break;
    }
  }

  /**
   * Run `fn`, recording every undo action it pushes as one undo step, so a
   * group move/delete/restyle comes back with a single Ctrl+Z.
   */
  private batchUndo(fn: () => void): void {
    const real = this.undoRedo;
    if (!real) { fn(); return; }
    const actions: import('../features/UndoRedoManager.js').UndoableAction[] = [];
    this.undoRedo = { push: (a: import('../features/UndoRedoManager.js').UndoableAction) => { actions.push(a); } } as unknown as UndoRedoManager;
    try {
      fn();
    } finally {
      this.undoRedo = real;
    }
    if (actions.length === 1) real.push(actions[0]);
    else if (actions.length > 1) real.push({ type: 'drawingBatch', before: null, after: null, actions });
  }

  // --- Multi-selection: Ctrl/⌘-drag a box, Ctrl/⌘-click ---

  private isSelectedId(id: string): boolean {
    return id === this.selectedDrawingId || this.groupIds.has(id);
  }

  private clearSelection(): void {
    this.selectedDrawingId = null;
    this.groupIds.clear();
  }

  private addToSelection(id: string): void {
    if (!this.selectedDrawingId) this.selectedDrawingId = id;
    else if (id !== this.selectedDrawingId) this.groupIds.add(id);
    this.state = 'selected';
  }

  /** Ids of every selected drawing, the primary one first. */
  getSelectedDrawingIds(): string[] {
    return this.selectedDrawingId ? [this.selectedDrawingId, ...this.groupIds] : [];
  }

  /**
   * Select every visible drawing with an anchor inside the pixel rectangle
   * (the Ctrl/⌘-drag selection). Replaces the current selection.
   * Returns how many were selected.
   */
  selectInRect(rect: { x0: number; y0: number; x1: number; y1: number }, viewport: ViewportState): number {
    if (this.state === 'creating') return 0;
    this.clearSelection();
    this.state = 'idle';
    const left = Math.min(rect.x0, rect.x1);
    const right = Math.max(rect.x0, rect.x1);
    const top = Math.min(rect.y0, rect.y1);
    const bottom = Math.max(rect.y0, rect.y1);
    for (const d of this.drawings) {
      if (!d.visible) continue;
      const inside = d.anchors.some((a) => {
        const x = timeToX(a.time, viewport);
        const y = priceToY(a.price, viewport);
        return x >= left && x <= right && y >= top && y <= bottom;
      });
      if (inside) this.addToSelection(d.id);
    }
    this.requestRender?.();
    return this.getSelectedDrawingIds().length;
  }

  /** Ctrl/⌘-click: add the drawing under `pos` to the selection, or take it out. */
  toggleSelectionAt(pos: Point, viewport: ViewportState): boolean {
    if (this.state === 'creating') return false;
    for (let i = this.drawings.length - 1; i >= 0; i--) {
      const d = this.drawings[i];
      if (!d.visible) continue;
      const plugin = this.registry.get(d.type);
      if (!plugin?.hitTest(pos, d, viewport, 8)) continue;
      if (!this.isSelectedId(d.id)) {
        this.addToSelection(d.id);
      } else if (d.id === this.selectedDrawingId) {
        // Promote another member to primary, if any.
        const next = this.groupIds.values().next();
        this.selectedDrawingId = next.done ? null : next.value;
        if (!next.done) this.groupIds.delete(next.value);
      } else {
        this.groupIds.delete(d.id);
      }
      if (!this.selectedDrawingId) this.state = 'idle';
      this.requestRender?.();
      return true;
    }
    return false;
  }

  /** Begin moving `primary` — and every other selected drawing with it. */
  private beginMove(pos: Point, primary: DrawingState): void {
    this.state = 'moving';
    this.dragStartPoint = pos;
    this.dragStartAnchors = primary.anchors.map((a) => ({ ...a }));
    this.dragBeforeState = cloneDrawing(primary);
    this.groupDrag = [];
    for (const id of this.getSelectedDrawingIds()) {
      if (id === primary.id) continue;
      const d = this.drawings.find((x) => x.id === id);
      if (d && !d.locked) this.groupDrag.push({ id, anchors: d.anchors.map((a) => ({ ...a })), before: cloneDrawing(d) });
    }
  }

  // --- Bulk operations ---

  lockAllDrawings(): void {
    for (const d of this.drawings) d.locked = true;
    this.requestRender?.();
  }

  unlockAllDrawings(): void {
    for (const d of this.drawings) d.locked = false;
    this.requestRender?.();
  }

  hideAllDrawings(): void {
    for (const d of this.drawings) d.visible = false;
    this.clearSelection();
    this.state = 'idle';
    this.requestRender?.();
  }

  showAllDrawings(): void {
    for (const d of this.drawings) d.visible = true;
    this.requestRender?.();
  }

  /** Toggle a single drawing's visibility. Returns the new value, or null if not found. */
  setDrawingVisible(id: string, visible: boolean): boolean | null {
    const d = this.drawings.find((x) => x.id === id);
    if (!d) return null;
    d.visible = visible;
    if (!visible && this.isSelectedId(id)) this.clearSelection();
    this.requestRender?.();
    return visible;
  }

  /** Toggle a single drawing's lock. Returns the new value, or null if not found. */
  setDrawingLocked(id: string, locked: boolean): boolean | null {
    const d = this.drawings.find((x) => x.id === id);
    if (!d) return null;
    d.locked = locked;
    this.requestRender?.();
    return locked;
  }

  // --- Tool selection ---

  setActiveTool(type: DrawingToolType | null): void {
    this.activeTool = type;
    this.state = type ? 'creating' : 'idle';
    this.creatingDrawing = null;
    this.committedAnchors = 0;
    this.previewAnchor = null;
  }

  getActiveTool(): DrawingToolType | null {
    return this.activeTool;
  }

  setStyle(style: Partial<DrawingStyle>): void {
    Object.assign(this.activeStyle, style);
  }

  /** Current style applied to newly created drawings. */
  getActiveStyle(): DrawingStyle {
    return { ...this.activeStyle };
  }

  /**
   * Restyle the selected drawing (or a specific one by id). Records an undo
   * entry. Returns true if a drawing was restyled.
   */
  setSelectedDrawingStyle(style: Partial<DrawingStyle>, id?: string): boolean {
    // Without an explicit id, every selected drawing is restyled together.
    const targetIds = id ? [id] : this.getSelectedDrawingIds();
    let changed = false;
    this.batchUndo(() => {
      for (const targetId of targetIds) {
        const drawing = this.drawings.find((d) => d.id === targetId);
        if (!drawing || drawing.locked) continue;
        const before = cloneDrawing(drawing);
        drawing.style = { ...drawing.style, ...style };
        this.undoRedo?.push({ type: 'drawingModify', before, after: cloneDrawing(drawing) });
        changed = true;
      }
    });
    if (changed) this.requestRender?.();
    return changed;
  }

  // --- Pointer events (returns true if consumed) ---

  onPointerDown(pos: Point, viewport: ViewportState): boolean {
    if (this.state === 'creating' && this.activeTool) {
      return this.handleCreationClick(pos, viewport);
    }

    if (this.state === 'idle' || this.state === 'selected') {
      return this.handleSelectionClick(pos, viewport);
    }

    return false;
  }

  onPointerMove(pos: Point, viewport: ViewportState): boolean {
    if (this.state === 'creating' && this.creatingDrawing) {
      const plugin = this.registry.get(this.creatingDrawing.type);
      if (plugin && this.committedAnchors < plugin.descriptor.requiredAnchors) {
        const rawTime = xToTime(pos.x, viewport);
        const rawPrice = yToPrice(pos.y, viewport);
        this.previewAnchor = this.snapToOHLC(rawTime, rawPrice, viewport);
        this.requestRender?.();
        return true;
      }
    }

    if (this.state === 'moving' && this.selectedDrawingId && this.dragStartPoint) {
      return this.handleMove(pos, viewport);
    }

    if (this.state === 'resizing' && this.selectedDrawingId && this.dragAnchorIndex >= 0) {
      return this.handleResize(pos, viewport);
    }

    return false;
  }

  onPointerUp(): boolean {
    if (this.state === 'moving' || this.state === 'resizing') {
      // Record undo for the completed move/resize — not for a press that
      // only selected the drawing without moving it.
      const moved = [
        ...(this.dragBeforeState && this.selectedDrawingId
          ? [{ id: this.selectedDrawingId, before: this.dragBeforeState }]
          : []),
        ...this.groupDrag.map((m) => ({ id: m.id, before: m.before })),
      ];
      this.batchUndo(() => {
        for (const { id, before } of moved) {
          const drawing = this.drawings.find((d) => d.id === id);
          if (drawing && !sameAnchors(drawing.anchors, before.anchors)) {
            this.undoRedo?.push({ type: 'drawingModify', before, after: cloneDrawing(drawing) });
          }
        }
      });
      this.groupDrag = [];
      this.state = 'selected';
      this.dragStartPoint = null;
      this.dragStartAnchors = [];
      this.dragAnchorIndex = -1;
      this.dragBeforeState = null;
      return true;
    }
    return false;
  }

  onKeyDown(key: string, ctrlKey = false): boolean {
    // Ctrl+D to duplicate selected drawing
    if (ctrlKey && (key === 'd' || key === 'D')) {
      if (this.state === 'selected' && this.selectedDrawingId) {
        if (this.duplicateDrawing(this.selectedDrawingId)) return true;
      }
    }

    // Ctrl+Z / Ctrl+Y for undo/redo
    if (ctrlKey && (key === 'z' || key === 'Z')) {
      if (this.undo()) { return true; }
    }
    if (ctrlKey && (key === 'y' || key === 'Y')) {
      if (this.redo()) { return true; }
    }

    if (key === 'Escape') {
      if (this.state === 'creating') {
        this.setActiveTool(null);
        this.requestRender?.();
        return true;
      }
      if (this.state === 'selected') {
        this.clearSelection();
        this.state = 'idle';
        this.requestRender?.();
        return true;
      }
    }
    if (key === 'Delete' || key === 'Backspace') {
      if (this.state === 'selected' && this.selectedDrawingId) {
        // Every selected drawing that isn't locked goes, as one undo step.
        const removable = this.getSelectedDrawingIds()
          .filter((id) => !this.drawings.find((d) => d.id === id)?.locked);
        if (removable.length === 0) return false; // Can't delete locked drawings
        this.batchUndo(() => { for (const id of removable) this.removeDrawing(id); });
        this.clearSelection();
        this.state = 'idle';
        this.requestRender?.();
        return true;
      }
    }
    return false;
  }

  // --- Drawing CRUD ---

  getDrawings(): DrawingState[] {
    return this.drawings;
  }

  setDrawings(states: DrawingState[]): void {
    this.drawings = this.upgradeLegacyAnchors(states);
    this.requestRender?.();
  }

  /**
   * Append a drawing (assigning a fresh id and applying the active style for any
   * omitted style fields). Records an undo entry. Returns the new id.
   */
  addDrawing(
    state: Omit<DrawingState, 'id' | 'style' | 'visible' | 'locked'> & {
      id?: string;
      style?: Partial<DrawingStyle>;
      visible?: boolean;
      locked?: boolean;
    },
  ): string {
    const id = state.id ?? `tc_drawing_${nextDrawingId++}`;
    const drawing: DrawingState = {
      id,
      type: state.type,
      anchors: state.anchors.map((a) => ({ ...a })),
      style: { ...this.activeStyle, ...state.style },
      visible: state.visible ?? true,
      locked: state.locked ?? false,
      meta: state.meta,
    };
    this.drawings = [...this.drawings, drawing];
    this.undoRedo?.push({ type: 'drawingCreate', before: null, after: cloneDrawing(drawing) });
    this.eventCallback?.('drawingCreate', { id, type: drawing.type });
    this.requestRender?.();
    return id;
  }

  /**
   * Auto-migrate legacy bar-index anchors to real timestamps when data is
   * available. Heuristic: anchors with `time < 1e9` are treated as bar indices
   * (timestamps in seconds are > 1e9 for any date after 2001-09-09), and
   * upgraded by looking up the corresponding bar's timestamp. Anchors that
   * already look like timestamps are passed through untouched. Idempotent.
   */
  private upgradeLegacyAnchors(states: DrawingState[]): DrawingState[] {
    const data = this.dataGetter?.();
    if (!data || data.length === 0) return states;
    const TIMESTAMP_THRESHOLD = 1e9;
    return states.map(d => ({
      ...d,
      anchors: d.anchors.map(a => {
        if (a.time >= TIMESTAMP_THRESHOLD) return a;
        const idx = Math.max(0, Math.min(data.length - 1, Math.round(a.time)));
        return { ...a, time: data[idx].time };
      }),
    }));
  }

  removeDrawing(id: string): void {
    const removed = this.drawings.find(d => d.id === id);
    this.drawings = this.drawings.filter((d) => d.id !== id);
    if (removed) {
      this.undoRedo?.push({
        type: 'drawingRemove',
        before: structuredClone(removed),
        after: null,
      });
    }
    this.eventCallback?.('drawingRemove', { id });
    this.requestRender?.();
  }

  duplicateDrawing(id: string): string | null {
    const drawing = this.drawings.find(d => d.id === id);
    if (!drawing) return null;

    const newDrawing: DrawingState = structuredClone(drawing);
    newDrawing.id = `tc_drawing_${nextDrawingId++}`;
    // Offset by 3 bars so the copy is visually distinct. When anchors are
    // timestamps, "3 bars" means 3 × median bar interval in the current
    // series; when anchors are bar indices (legacy / no data), it's literal.
    const timeOffset = this.computeBarOffsetTime(3);
    newDrawing.anchors = newDrawing.anchors.map(a => ({
      ...a,
      time: a.time + timeOffset,
    }));
    newDrawing.locked = false;

    this.drawings.push(newDrawing);
    this.undoRedo?.push({
      type: 'drawingCreate',
      before: null,
      after: structuredClone(newDrawing),
    });
    this.selectedDrawingId = newDrawing.id;
    this.state = 'selected';
    this.eventCallback?.('drawingCreate', { drawing: newDrawing });
    this.requestRender?.();
    return newDrawing.id;
  }

  clearDrawings(): void {
    this.drawings = [];
    this.clearSelection();
    this.state = 'idle';
    this.requestRender?.();
  }

  getSelectedDrawingId(): string | null {
    return this.selectedDrawingId;
  }

  // --- Render ---

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState): void {
    // Clip to chart area so drawings don't bleed into axis areas
    ctx.save();
    ctx.beginPath();
    ctx.rect(viewport.chartRect.x, viewport.chartRect.y, viewport.chartRect.width, viewport.chartRect.height);
    ctx.clip();

    for (const drawing of this.drawings) {
      if (!drawing.visible) continue;
      const plugin = this.registry.get(drawing.type);
      if (!plugin) continue;
      const isSelected = this.isSelectedId(drawing.id);
      plugin.render(ctx, drawing, viewport, isSelected);
    }

    // Render drawing being created (with preview anchor)
    if (this.creatingDrawing && this.committedAnchors > 0) {
      const plugin = this.registry.get(this.creatingDrawing.type);
      if (plugin) {
        // Build preview state: committed anchors + optional preview anchor
        const previewState: DrawingState = {
          ...this.creatingDrawing,
          anchors: this.previewAnchor
            ? [...this.creatingDrawing.anchors, this.previewAnchor]
            : [...this.creatingDrawing.anchors],
        };
        plugin.render(ctx, previewState, viewport, false);
      }
    }

    ctx.restore();
  }

  // --- Internal ---

  /**
   * Compute the offset (in anchor-time units) equivalent to `n` bars.
   * When the viewport carries data and anchors are timestamps, this is
   * `n × median bar interval`; otherwise it's just `n` (bar-index mode).
   */
  private computeBarOffsetTime(n: number): number {
    const data = this.dataGetter?.();
    if (!data || data.length < 2) return n;
    // Only meaningful in timestamp mode — detect via data presence.
    // Use median of the last few intervals to be robust against gaps.
    const sampleStart = Math.max(0, data.length - 20);
    const intervals: number[] = [];
    for (let i = sampleStart + 1; i < data.length; i++) {
      intervals.push(data[i].time - data[i - 1].time);
    }
    if (intervals.length === 0) return n;
    intervals.sort((a, b) => a - b);
    const median = intervals[Math.floor(intervals.length / 2)];
    return n * median;
  }

  private handleCreationClick(pos: Point, viewport: ViewportState): boolean {
    if (!this.activeTool) return false;
    const plugin = this.registry.get(this.activeTool);
    if (!plugin) return false;

    const rawTime = xToTime(pos.x, viewport);
    const rawPrice = yToPrice(pos.y, viewport);
    const anchor = this.snapToOHLC(rawTime, rawPrice, viewport);

    if (!this.creatingDrawing) {
      // First click: start creation
      this.creatingDrawing = {
        id: `tc_drawing_${nextDrawingId++}`,
        type: this.activeTool,
        anchors: [anchor],
        style: { ...this.activeStyle },
        visible: true,
        locked: false,
      };
      this.committedAnchors = 1;
      this.previewAnchor = null;

      if (plugin.descriptor.requiredAnchors === 1) {
        this.finalizeCreation();
      }
      this.requestRender?.();
      return true;
    }

    // Subsequent click: commit the anchor
    this.creatingDrawing.anchors.push(anchor);
    this.committedAnchors++;
    this.previewAnchor = null;

    if (this.committedAnchors >= plugin.descriptor.requiredAnchors) {
      this.finalizeCreation();
    }

    this.requestRender?.();
    return true;
  }

  private finalizeCreation(): void {
    if (!this.creatingDrawing) return;
    this.drawings.push(this.creatingDrawing);
    this.selectedDrawingId = this.creatingDrawing.id;
    // Record undo action
    this.undoRedo?.push({
      type: 'drawingCreate',
      before: null,
      after: structuredClone(this.creatingDrawing),
    });
    this.eventCallback?.('drawingCreate', { drawing: this.creatingDrawing });
    this.creatingDrawing = null;
    this.committedAnchors = 0;
    this.previewAnchor = null;
    this.activeTool = null;
    this.state = 'selected';
  }

  /** True while a drawing is being moved or reshaped by its handle. */
  isDragging(): boolean {
    return this.state === 'moving' || this.state === 'resizing';
  }

  /**
   * Cursor for hovering `pos`: 'move' over a handle of the selected drawing,
   * 'pointer' over any drawing that can be grabbed, otherwise null. Null too
   * while a drawing tool is active (the chart keeps its crosshair).
   */
  hoverCursorAt(pos: Point, viewport: ViewportState): 'move' | 'pointer' | null {
    if (this.activeTool || this.state === 'creating') return null;
    const tolerance = 8;
    if (this.selectedDrawingId) {
      const selected = this.drawings.find((d) => d.id === this.selectedDrawingId);
      const plugin = selected && !selected.locked ? this.registry.get(selected.type) : undefined;
      if (selected && plugin && plugin.hitTestAnchor(pos, selected, viewport, tolerance) >= 0) return 'move';
    }
    for (let i = this.drawings.length - 1; i >= 0; i--) {
      const d = this.drawings[i];
      if (!d.visible || d.locked) continue;
      const plugin = this.registry.get(d.type);
      if (plugin?.hitTest(pos, d, viewport, tolerance)) return 'pointer';
    }
    return null;
  }

  private handleSelectionClick(pos: Point, viewport: ViewportState): boolean {
    const tolerance = 8;

    // If already selected, check for anchor drag
    if (this.selectedDrawingId) {
      const drawing = this.drawings.find((d) => d.id === this.selectedDrawingId);
      if (drawing && !drawing.locked) {
        const plugin = this.registry.get(drawing.type);
        if (plugin) {
          const anchorIdx = plugin.hitTestAnchor(pos, drawing, viewport, tolerance);
          if (anchorIdx >= 0) {
            this.state = 'resizing';
            this.dragAnchorIndex = anchorIdx;
            this.dragStartPoint = pos;
            this.dragBeforeState = cloneDrawing(drawing);
            return true;
          }
          if (plugin.hitTest(pos, drawing, viewport, tolerance)) {
            this.beginMove(pos, drawing);
            return true;
          }
        }
      }
    }

    // Try to select a drawing
    for (let i = this.drawings.length - 1; i >= 0; i--) {
      const drawing = this.drawings[i];
      if (!drawing.visible) continue;
      const plugin = this.registry.get(drawing.type);
      if (!plugin) continue;
      if (plugin.hitTest(pos, drawing, viewport, tolerance)) {
        if (this.isSelectedId(drawing.id)) {
          // Part of the current selection: make it the primary, keep the group.
          if (this.selectedDrawingId && this.selectedDrawingId !== drawing.id) {
            this.groupIds.add(this.selectedDrawingId);
          }
          this.groupIds.delete(drawing.id);
          this.selectedDrawingId = drawing.id;
        } else {
          this.clearSelection();
          this.selectedDrawingId = drawing.id;
        }
        this.requestRender?.();
        if (drawing.locked) {
          // A locked drawing can be selected but not moved — let the same
          // press pan the chart instead of swallowing it.
          this.state = 'selected';
          return false;
        }
        // The press that selects a drawing also grabs it: dragging moves it
        // straight away. Selecting first and needing a second drag felt like
        // the chart was stuck.
        this.beginMove(pos, drawing);
        return true;
      }
    }

    // Clicked empty space — deselect
    if (this.selectedDrawingId) {
      this.clearSelection();
      this.state = 'idle';
      this.requestRender?.();
    }
    return false;
  }

  private handleMove(pos: Point, viewport: ViewportState): boolean {
    const drawing = this.drawings.find((d) => d.id === this.selectedDrawingId);
    if (!drawing || !this.dragStartPoint) return false;
    // A click that wobbles a pixel or two shouldn't nudge the drawing.
    if (Math.hypot(pos.x - this.dragStartPoint.x, pos.y - this.dragStartPoint.y) < DRAG_START_PX
      && drawing.anchors.every((a, i) => a.time === this.dragStartAnchors[i]?.time && a.price === this.dragStartAnchors[i]?.price)) {
      return true;
    }

    // Translate by anchor-time delta. In timestamp mode this is a wall-clock
    // seconds difference; in bar-index mode it's a bar-count difference —
    // `xToTime` returns whichever unit the viewport is set up for.
    const dTime = xToTime(pos.x, viewport) - xToTime(this.dragStartPoint.x, viewport);
    const dPrice = yToPrice(pos.y, viewport) - yToPrice(this.dragStartPoint.y, viewport);

    drawing.anchors = this.dragStartAnchors.map((a) => ({
      time: a.time + dTime,
      price: a.price + dPrice,
    }));
    for (const member of this.groupDrag) {
      const d = this.drawings.find((x) => x.id === member.id);
      if (d) d.anchors = member.anchors.map((a) => ({ time: a.time + dTime, price: a.price + dPrice }));
    }

    this.requestRender?.();
    return true;
  }

  private handleResize(pos: Point, viewport: ViewportState): boolean {
    const drawing = this.drawings.find((d) => d.id === this.selectedDrawingId);
    if (!drawing || this.dragAnchorIndex < 0) return false;

    drawing.anchors[this.dragAnchorIndex] = {
      time: xToTime(pos.x, viewport),
      price: yToPrice(pos.y, viewport),
    };

    this.requestRender?.();
    return true;
  }
}
