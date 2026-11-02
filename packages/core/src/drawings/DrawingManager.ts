import type { PointerReach } from '../interaction/pointerReach.js';
import type {
  DrawingPlugin,
  DrawingState,
  DrawingToolType,
  DrawingStyle,
  DrawingOptions,
  DrawingOptionDefs,
  Point,
  ViewportState,
  OHLCBar,
  AnchorPoint,
} from '@tradecanvas/commons';
import { resolveDrawingOptions, sanitizeDrawingOptions } from '@tradecanvas/commons';
import { priceToY, timeToX, xToTime, yToPrice } from '../viewport/ScaleMapping.js';
import type { UndoRedoManager, UndoableAction } from '../features/UndoRedoManager.js';
import {
  MAX_GROUP_NAME,
  cloneDrawing,
  cloneOptions,
  newDrawingId,
  newGroupId,
  reserveIds,
  sameAnchors,
  sameOptions,
  type DrawingOrderMove,
  type DrawingPatch,
} from './drawingState.js';
import { orderTarget, redoAction, undoAction } from './drawingHistory.js';
import { drawingShortcut } from './drawingShortcuts.js';
import { DrawingCreator, type CreationStep } from './DrawingCreator.js';
import { snapToBar, snapToValues, type MagnetMode } from './magnetSnap.js';
import { cleanIntervals, shownOnInterval } from '../indicators/intervals.js';
import { DrawingSelection } from './DrawingSelection.js';
import { DrawingDrag, shiftAnchors, type DragEdit } from './DrawingDrag.js';
import { constrainedAnchor, keepsAngle } from './drawingEditing.js';

export type { DrawingOrderMove, DrawingPatch } from './drawingState.js';

type DrawingEventCallback = (event: string, data: unknown) => void;

export type DrawingInteractionState = 'idle' | 'creating' | 'selected' | 'moving' | 'resizing';
export type { MagnetMode } from './magnetSnap.js';

/**
 * Copied drawings, shared by every chart on the page so a copy can be pasted
 * into another chart. `pastes` counts pastes since the copy, to stagger them.
 */
const clipboard: { drawings: DrawingState[]; pastes: number } = { drawings: [], pastes: 0 };


/** Anchor times below this, on bars timed by timestamps, are bar indices from old saves. */
const LEGACY_INDEX_LIMIT = 1e7;

/** How far, px, a press may land from a drawing's line and from a handle of the selected one. */
export type DrawingReach = Pick<PointerReach, 'line' | 'handle'>;
const MOUSE_REACH: DrawingReach = { line: 8, handle: 8 };
/** Pointer travel (px) before a Ctrl/⌘-press on a drawing makes a copy; less only toggles its selection. */
const COPY_START_PX = 8;
/** Arrow presses this close together (ms) on the same selection are one undo step. */
const NUDGE_MERGE_MS = 1000;

/** The modifier keys held, as the pointer last reported them. */
export interface DrawingModifiers {
  /** Ctrl, or ⌘ on a Mac: turns the magnet over while held. */
  ctrl: boolean;
  /** Keeps a line being drawn or reshaped at a multiple of 45°. */
  shift: boolean;
}

/**
 * The chart's indicator panes, for drawings made on them: which pane a point
 * is in, and each pane's viewport (its rect and value range) to draw and
 * read a drawing with.
 */
export interface DrawingPanes {
  /** The pane under `pos`: its id; undefined for the price pane; null where no drawing goes (an axis, a side or folded pane). */
  paneAt(pos: Point): string | null | undefined;
  /** A pane's viewport while it is drawn; null while it is folded or gone. */
  viewportOf(paneId: string): ViewportState | null;
  /** Whether the pane is on the chart, folded or not. */
  hasPane(paneId: string): boolean;
  /** The values a pane's lines have at a bar, for the magnet. */
  valuesAt?(paneId: string, barIndex: number): readonly number[];
}

/** Whether `pos` is inside `rect`, its edges included. */
function inRect(pos: Point, rect: { x: number; y: number; width: number; height: number }): boolean {
  return pos.x >= rect.x && pos.x <= rect.x + rect.width && pos.y >= rect.y && pos.y <= rect.y + rect.height;
}

/** A step of the shared history that isn't about drawings: the chart's indicators, or its owner's. */
function isForeignStep(action: UndoableAction): boolean {
  return action.type === 'indicators' || action.type === 'custom';
}

/** Whether a batch holds such a step, at any depth. */
function holdsForeignStep(action: UndoableAction): boolean {
  return (action.actions ?? []).some((step) => isForeignStep(step) || holdsForeignStep(step));
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
  /** The drawing being made with the pointer. */
  private creator = new DrawingCreator();
  /** When the last drawing was finished, and the last press that drew (ms). */
  private finishedAt = -Infinity;
  private creationPressAt = -Infinity;
  /** The eraser: a click on a drawing removes it. */
  private eraser = false;
  private selection = new DrawingSelection();
  /** Start state of the other group members while the group is dragged. */
  /** Drawings being moved or reshaped with the pointer. */
  private drag = new DrawingDrag((id) => this.drawings.find((d) => d.id === id));
  private eventCallback: DrawingEventCallback | null = null;
  private requestRender: (() => void) | null = null;
  private undoRedo: UndoRedoManager | null = null;
  private magnetMode: MagnetMode = 'none';
  private mods: DrawingModifiers = { ctrl: false, shift: false };
  /** A Ctrl/⌘-press on a drawing, not yet a copy: where, and on which. */
  private pendingCopy: { pos: Point; id: string } | null = null;
  /** The copies a Ctrl/⌘-drag is moving; made in the undo history when it ends. */
  private copies: string[] | null = null;
  /** Each copy's original anchors, to tell a copy dragged back onto its original. */
  private copySources = new Map<string, AnchorPoint[]>();
  /** The last arrow press: to merge a run of them into one undo step. */
  private lastNudge: { key: string; at: number; before: DrawingState[]; action: UndoableAction | null } | null = null;
  private dataGetter: (() => OHLCBar[]) | null = null;
  /** Moves when a bar of the same array was replaced: see `setDataGetter`. */
  private dataRevision: () => number = () => 0;
  private displayDataGetter: (() => OHLCBar[]) | null = null;
  /** Keep the tool after a drawing is finished, to draw several in a row. */
  private stayInDrawingMode = false;
  /** Tools this chart allows (e.g. a whitelist); pasting skips the others. */
  private toolAllowed: (type: DrawingToolType) => boolean = () => true;
  /** Options new drawings of a tool start with ("save as default"). */
  private toolDefaults = new Map<DrawingToolType, DrawingOptions>();
  /** Drawings being edited (a settings dialog), with their state when the edit began. */
  private edits = new Map<string, DrawingState>();
  /** Undo actions gathered by `batchUndo`, pushed as one step when it ends. */
  private batch: UndoableAction[] | null = null;
  /** The chart's interval (`'5m'`): drawings kept to some intervals show on theirs. Null: not known, all show. */
  private timeframe: string | null = null;

  register(plugin: DrawingPlugin): void {
    this.registry.set(plugin.descriptor.type, plugin);
    if (this.dataGetter) plugin.setDataGetter?.(this.dataGetter, this.dataRevision);
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

  /** The modifier keys held: Ctrl/⌘ turns the magnet over, Shift keeps lines at 45° steps. */
  setModifiers(mods: DrawingModifiers): void {
    this.mods = { ctrl: mods.ctrl, shift: mods.shift };
  }

  /**
   * The magnet as it acts now: Ctrl/⌘ held turns it on when it is off and off
   * when it is on. Not during a Ctrl/⌘-drag copy, where the key means copy.
   */
  private activeMagnet(): MagnetMode {
    if (!this.mods.ctrl || this.copies) return this.magnetMode;
    return this.magnetMode === 'none' ? 'strong' : 'none';
  }

  /**
   * The chart's bars, for legacy anchors and the tools drawn from bars, and
   * their revision, which moves when one was replaced in the same array (a
   * correction): what a tool computed from them is stale then.
   */
  setDataGetter(getter: () => OHLCBar[], revision: () => number = () => 0): void {
    this.dataGetter = getter;
    this.dataRevision = revision;
    for (const plugin of this.registry.values()) plugin.setDataGetter?.(getter, revision);
  }

  /** Set a separate getter for display data (e.g. Heikin Ashi transformed). Used by magnet snap. */
  setDisplayDataGetter(getter: () => OHLCBar[]): void {
    this.displayDataGetter = getter;
  }

  private panes: DrawingPanes | null = null;

  /**
   * The chart's indicator panes: drawings begun on one are made, drawn and
   * moved on its scale. Without them every drawing is the price pane's.
   */
  setPanes(panes: DrawingPanes | null): void {
    this.panes = panes;
  }

  /** The pane a press lands in: undefined the price pane, null none a drawing takes. */
  private paneAt(pos: Point): string | null | undefined {
    return this.panes ? this.panes.paneAt(pos) : undefined;
  }

  /** The viewport a drawing of `paneId` is drawn and read with: `main` for the price pane; null while its pane isn't drawn. */
  private viewportFor(paneId: string | undefined, main: ViewportState): ViewportState | null {
    if (paneId === undefined) return main;
    return this.panes?.viewportOf(paneId) ?? null;
  }

  /**
   * Where a press at `pos` looks for drawings: the pane it lands in and that
   * pane's viewport; null where no drawing is.
   */
  private scopeAt(pos: Point, main: ViewportState): { pane: string | undefined; viewport: ViewportState } | null {
    // Without the chart's panes, only the price plot has drawings: never an axis beside it.
    if (!this.panes && !inRect(pos, main.chartRect)) return null;
    const pane = this.paneAt(pos);
    if (pane === null) return null;
    const viewport = this.viewportFor(pane, main);
    return viewport ? { pane, viewport } : null;
  }

  /**
   * Point the drawings of each pane in `renames` (old id to new) at the new
   * one: the indicator that owned a pane was removed or moved, and another
   * took the pane over, or a layout gave the indicators new ids.
   */
  renamePanes(renames: ReadonlyMap<string, string>): void {
    let changed = false;
    this.drawings = this.drawings.map((d) => {
      const to = d.paneId !== undefined ? renames.get(d.paneId) : undefined;
      if (to === undefined || to === d.paneId) return d;
      changed = true;
      return { ...d, paneId: to };
    });
    if (changed) this.requestRender?.();
  }

  // --- Magnet snap ---

  /** Snap a point being placed to the bar under it (see `snapToBar`), on the bars as drawn (Heikin Ashi, say). */
  private snapToOHLC(time: number, price: number, viewport?: ViewportState, paneId?: string): AnchorPoint {
    const mode = this.activeMagnet();
    const bars = mode === 'none' ? [] : this.displayDataGetter?.() ?? this.dataGetter?.() ?? [];
    // On an indicator pane, its lines' values: the bars' prices mean nothing there.
    if (paneId !== undefined) {
      const valuesAt = this.panes?.valuesAt;
      return snapToValues(time, price, mode, bars, (i) => valuesAt?.(paneId, i) ?? [], viewport);
    }
    return snapToBar(time, price, mode, bars, viewport);
  }

  /**
   * The magnet and the Shift angle for a drag of `drawing` on `viewport`.
   * None for a freehand stroke: its points are where the hand went.
   */
  private dragEdit(drawing: DrawingState, viewport: ViewportState): DragEdit | undefined {
    if (this.registry.get(drawing.type)?.descriptor.creation === 'freehand') return undefined;
    return {
      handleAt: (pos, d, handle) => {
        // The point the dragged one is kept at 45° steps from: the one before it, or the next for the first.
        const other = keepsAngle(d.type) && d.anchors.length >= 2 && handle < d.anchors.length ? d.anchors[handle === 0 ? 1 : handle - 1] : undefined;
        if (this.mods.shift && other) return constrainedAnchor(other, pos, viewport);
        return this.snapToOHLC(xToTime(pos.x, viewport), yToPrice(pos.y, viewport), viewport, d.paneId);
      },
      snap: (anchor) => this.snapToOHLC(anchor.time, anchor.price, viewport, drawing.paneId),
    };
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

  /** Steps in the shared history that aren't about drawings (the chart's indicators, steps of its owner). */
  private foreignHistory: ((action: UndoableAction, direction: 'undo' | 'redo') => void) | null = null;

  /** Who undoes and redoes the history's steps that aren't about drawings. */
  setForeignHistory(handler: ((action: UndoableAction, direction: 'undo' | 'redo') => void) | null): void {
    this.foreignHistory = handler;
  }

  private applyUndoAction(action: UndoableAction): void {
    if (isForeignStep(action)) {
      this.foreignHistory?.(action, 'undo');
      return;
    }
    // A batch holding indicator or owner steps (the chart cleared at once) goes step by step, last first.
    if (action.type === 'drawingBatch' && holdsForeignStep(action)) {
      for (const step of [...(action.actions ?? [])].reverse()) this.applyUndoAction(step);
      return;
    }
    this.applyHistory(undoAction(this.drawings, action));
  }

  private applyRedoAction(action: UndoableAction): void {
    if (isForeignStep(action)) {
      this.foreignHistory?.(action, 'redo');
      return;
    }
    if (action.type === 'drawingBatch' && holdsForeignStep(action)) {
      for (const step of action.actions ?? []) this.applyRedoAction(step);
      return;
    }
    this.applyHistory(redoAction(this.drawings, action));
  }

  /**
   * Put the drawings an undo or redo left, and report them: drawingRemove and
   * drawingCreate for drawings gone and back (their alerts follow them),
   * drawingUpdate for changed or reordered ones.
   */
  private applyHistory(next: DrawingState[]): void {
    const before = new Map(this.drawings.map((d, index) => [d.id, { d, index }]));
    this.drawings = next;
    this.settleAfterHistory();
    const now = new Set(next.map((d) => d.id));
    for (const id of before.keys()) {
      if (!now.has(id)) {
        this.edits.delete(id);
        this.eventCallback?.('drawingRemove', { id });
      }
    }
    next.forEach((d, index) => {
      const was = before.get(d.id);
      if (!was) this.eventCallback?.('drawingCreate', { id: d.id, type: d.type, drawing: d });
      else if (was.d !== d || was.index !== index) this.eventCallback?.('drawingUpdate', { id: d.id });
    });
  }

  /**
   * After undo/redo nothing is selected, and a picked tool (stay-in-drawing
   * mode, or one picked mid-drawing) stays ready for a fresh drawing.
   */
  private settleAfterHistory(): void {
    this.dropCopyGesture();
    this.selection.clear();
    this.creator.reset();
    this.state = this.activeTool ? 'creating' : 'idle';
    this.requestRender?.();
  }

  /** Record an undo step, or add it to the batch being gathered. */
  private record(action: UndoableAction): void {
    if (this.batch) this.batch.push(action);
    else this.undoRedo?.push(action);
  }

  /**
   * Run `fn`, recording every undo action it pushes as one undo step, so a
   * group move/delete/restyle comes back with a single Ctrl+Z. Nested calls
   * join the outer step.
   */
  private batchUndo(fn: () => void): void {
    if (this.batch) {
      fn();
      return;
    }
    const actions: UndoableAction[] = [];
    this.batch = actions;
    try {
      fn();
    } finally {
      this.batch = null;
    }
    if (actions.length === 1) this.undoRedo?.push(actions[0]);
    else if (actions.length > 1) this.undoRedo?.push({ type: 'drawingBatch', before: null, after: null, actions });
  }

  // --- Multi-selection: Ctrl/⌘-drag a box, Ctrl/⌘-click ---

  /** Take drawings out of the selection (hidden or removed); another selected one becomes the primary. */
  private deselect(ids: Iterable<string>): void {
    if (this.selection.remove(ids) && !this.selection.primary && this.state === 'selected') this.state = 'idle';
  }

  private addToSelection(id: string): void {
    this.selection.add(id);
    this.state = 'selected';
  }

  /**
   * The other drawings of `drawing`'s group (selected along with it); not
   * one hidden or kept off this interval, which would be moved or deleted unseen.
   */
  private groupMates(drawing: DrawingState): string[] {
    const group = drawing.group?.id;
    if (!group) return [];
    return this.drawings.filter((d) => d.group?.id === group && d.id !== drawing.id && this.shown(d)).map((d) => d.id);
  }

  /**
   * Select a drawing and the rest of its group (a menu opened on it, say). A
   * drawing already in the selection leaves the selection as it is. False
   * for an unknown or hidden drawing, or while a drawing is being drawn.
   */
  select(id: string): boolean {
    if (this.state === 'creating') return false;
    const drawing = this.drawings.find((d) => d.id === id);
    if (!drawing || !this.shown(drawing)) return false;
    if (!this.selection.has(id)) this.selection.only(id, this.groupMates(drawing));
    this.state = 'selected';
    this.requestRender?.();
    return true;
  }

  /** Told the selected drawings' ids (the primary first) each time the selection changes. */
  setSelectionListener(listener: ((ids: string[]) => void) | null): void {
    this.selection.setListener(listener);
  }

  /** Ids of every selected drawing, the primary one first. */
  getSelectedDrawingIds(): string[] {
    return this.selection.ids();
  }

  /**
   * Select every visible drawing with an anchor inside the pixel rectangle
   * (the Ctrl/⌘-drag selection), on pane `paneId` (the price pane when
   * left out). Replaces the current selection. Returns how many were selected.
   */
  selectInRect(rect: { x0: number; y0: number; x1: number; y1: number }, main: ViewportState, paneId?: string): number {
    if (this.state === 'creating') return 0;
    const viewport = this.viewportFor(paneId, main);
    if (!viewport) return 0;
    this.selection.clear();
    this.state = 'idle';
    const left = Math.min(rect.x0, rect.x1);
    const right = Math.max(rect.x0, rect.x1);
    const top = Math.min(rect.y0, rect.y1);
    const bottom = Math.max(rect.y0, rect.y1);
    for (const d of this.drawings) {
      if (!this.shown(d) || d.paneId !== paneId) continue;
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
    const scope = this.scopeAt(pos, viewport);
    if (!scope) return false;
    for (let i = this.drawings.length - 1; i >= 0; i--) {
      const d = this.drawings[i];
      if (!this.shown(d) || d.paneId !== scope.pane) continue;
      const plugin = this.registry.get(d.type);
      if (!plugin?.hitTest(pos, d, scope.viewport, 8)) continue;
      // Out of the selection, another selected drawing becomes the primary.
      if (!this.selection.has(d.id)) this.addToSelection(d.id);
      else this.deselect([d.id]);
      this.requestRender?.();
      return true;
    }
    return false;
  }

  /** Begin moving `primary` — and every other selected drawing that isn't locked with it. */
  private beginMove(pos: Point, primary: DrawingState): void {
    this.state = 'moving';
    const others = this.getSelectedDrawingIds()
      .filter((id) => id !== primary.id)
      .map((id) => this.drawings.find((d) => d.id === id))
      .filter((d): d is DrawingState => d !== undefined && !d.locked && d.paneId === primary.paneId);
    this.drag.beginMove(pos, [primary, ...others]);
  }

  // --- Bulk operations ---

  /** Set drawings' visible or locked flags, as one undo step; hidden ones leave the selection. */
  private setFlags(drawings: readonly DrawingState[], flags: Partial<Pick<DrawingState, 'visible' | 'locked'>>): void {
    this.batchUndo(() => {
      for (const d of drawings) {
        const same = (flags.visible === undefined || d.visible === flags.visible)
          && (flags.locked === undefined || d.locked === flags.locked);
        if (same) continue;
        const before = cloneDrawing(d);
        Object.assign(d, flags);
        this.record({ type: 'drawingModify', before, after: cloneDrawing(d) });
      }
    });
    if (flags.visible === false) this.deselect(drawings.map((d) => d.id));
    this.requestRender?.();
  }

  lockAllDrawings(): void {
    this.setFlags(this.drawings, { locked: true });
  }

  unlockAllDrawings(): void {
    this.setFlags(this.drawings, { locked: false });
  }

  hideAllDrawings(): void {
    this.setFlags(this.drawings, { visible: false });
  }

  showAllDrawings(): void {
    this.setFlags(this.drawings, { visible: true });
  }

  /**
   * The chart's interval (`'5m'`, `'1h'`; null when not known): drawings kept
   * to some intervals show on theirs only, and a selected one it hides is let go.
   */
  setTimeframe(timeframe: string | null): void {
    if (timeframe === this.timeframe) return;
    this.timeframe = timeframe;
    this.deselect(this.drawings.filter((d) => !this.shown(d)).map((d) => d.id));
    this.requestRender?.();
  }

  /** Whether a drawing is on the chart: not hidden, and kept to no intervals or to the chart's. */
  isShown(id: string): boolean {
    const drawing = this.drawings.find((d) => d.id === id);
    return drawing !== undefined && this.shown(drawing);
  }

  /** Whether a drawing's pane is drawn: the price pane always, an indicator pane while it is there and not folded. */
  private onDrawnPane(drawing: DrawingState): boolean {
    return drawing.paneId === undefined || (this.panes?.viewportOf(drawing.paneId) ?? null) !== null;
  }

  private shown(drawing: DrawingState): boolean {
    return drawing.visible && shownOnInterval(drawing.intervals, this.timeframe) && this.onDrawnPane(drawing);
  }

  /** Show or hide a drawing (one undo step). Returns the new value, or null if not found. */
  setDrawingVisible(id: string, visible: boolean): boolean | null {
    const d = this.drawings.find((x) => x.id === id);
    if (!d) return null;
    this.setFlags([d], { visible });
    return visible;
  }

  /** Show or hide several drawings as one undo step (a selection, say); unknown ids are passed over. */
  setDrawingsVisible(ids: readonly string[], visible: boolean): void {
    const wanted = new Set(ids);
    this.setFlags(this.drawings.filter((d) => wanted.has(d.id)), { visible });
  }

  /** Lock or unlock several drawings as one undo step. */
  setDrawingsLocked(ids: readonly string[], locked: boolean): void {
    const wanted = new Set(ids);
    this.setFlags(this.drawings.filter((d) => wanted.has(d.id)), { locked });
  }

  /** Lock or unlock a drawing (one undo step). Returns the new value, or null if not found. */
  setDrawingLocked(id: string, locked: boolean): boolean | null {
    const d = this.drawings.find((x) => x.id === id);
    if (!d) return null;
    this.setFlags([d], { locked });
    return locked;
  }

  // --- Tool selection ---

  setActiveTool(type: DrawingToolType | null): void {
    if (type) this.setEraser(false);
    this.dropCopyGesture();
    const changed = type !== this.activeTool;
    this.activeTool = type;
    this.state = type ? 'creating' : 'idle';
    this.creator.reset();
    if (changed) this.eventCallback?.('drawingToolChange', { tool: type });
  }

  /** When on, finishing a drawing keeps its tool active for the next one. */
  setStayInDrawingMode(enabled: boolean): void {
    this.stayInDrawingMode = enabled;
  }

  isStayInDrawingMode(): boolean {
    return this.stayInDrawingMode;
  }

  setToolFilter(allowed: (type: DrawingToolType) => boolean): void {
    this.toolAllowed = allowed;
  }

  // --- Copy / paste ---

  /** Copy the selected drawings. Returns how many were copied. */
  copySelection(): number {
    const selected = this.getSelectedDrawingIds()
      .map((id) => this.drawings.find((d) => d.id === id))
      .filter((d): d is DrawingState => d !== undefined);
    if (selected.length === 0) return 0;
    clipboard.drawings = selected.map((d) => structuredClone(d)); // meta can nest
    clipboard.pastes = 0;
    return selected.length;
  }

  /** Whether `paste()` would paste: something copied that this chart's tools take, and no drawing under way. */
  canPaste(): boolean {
    return this.state !== 'creating' && clipboard.drawings.some((d) => this.canPasteType(d.type));
  }

  private canPasteType(type: DrawingToolType): boolean {
    return this.registry.has(type) && this.toolAllowed(type);
  }

  /**
   * Paste the copied drawings as new, unlocked, selected drawings — one undo
   * step. Pasted back into the chart they came from, each paste is offset by
   * a few more bars so it doesn't cover the original. Returns the new ids.
   */
  paste(): string[] {
    if (clipboard.drawings.length === 0 || this.state === 'creating') return [];
    const fromHere = clipboard.drawings.every((c) => this.drawings.some((d) => d.id === c.id));
    clipboard.pastes += 1;
    const shift = fromHere ? this.computeBarOffsetTime(3 * clipboard.pastes) : 0;
    const ids: string[] = [];
    this.batchUndo(() => {
      for (const source of clipboard.drawings) {
        if (!this.canPasteType(source.type)) continue;
        // A pane's drawing goes back on that pane, where this chart has it; it means nothing on another.
        if (source.paneId !== undefined && (!this.panes?.hasPane(source.paneId) || this.registry.get(source.type)?.descriptor.priceOnly)) continue;
        ids.push(this.addDrawing({
          ...(source.paneId !== undefined ? { paneId: source.paneId } : {}),
          type: source.type,
          anchors: source.anchors.map((a) => ({ ...a, time: a.time + shift })),
          style: { ...source.style },
          options: source.options ? cloneOptions(source.options) : undefined,
          intervals: source.intervals,
          meta: source.meta ? structuredClone(source.meta) : undefined,
        }));
      }
    });
    if (ids.length === 0) return ids;
    this.selection.clear();
    this.state = 'idle';
    // One kept off this interval is pasted, but not selected unseen.
    for (const id of ids) if (this.isShown(id)) this.addToSelection(id);
    this.requestRender?.();
    return ids;
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
        this.record({ type: 'drawingModify', before, after: cloneDrawing(drawing) });
        changed = true;
      }
    });
    if (changed) this.requestRender?.();
    return changed;
  }

  // --- Pointer events (returns true if consumed) ---

  /**
   * A press at `pos`. `reach` is how far from a line or a handle it still
   * takes it, px: a finger's is wider than the mouse's 8.
   */
  onPointerDown(pos: Point, viewport: ViewportState, reach: DrawingReach = MOUSE_REACH): boolean {
    if (this.eraser) {
      const scope = this.scopeAt(pos, viewport);
      return scope ? this.erase(pos, scope, reach.line) : false;
    }
    if (this.state === 'creating' && this.activeTool) {
      return this.handleCreationClick(pos, viewport);
    }

    if (this.state === 'idle' || this.state === 'selected') {
      return this.handleSelectionClick(pos, viewport, reach);
    }

    return false;
  }

  /**
   * A finger lifted at `pos` after dragging from the first point of a drawing
   * being made: the next point goes there, so press, drag, lift draws a line
   * as two taps do. False (nothing placed) otherwise, and for freehand strokes.
   */
  placeAt(pos: Point, viewport: ViewportState): boolean {
    const making = this.state === 'creating' ? this.creator.current : null;
    if (!making || making.anchors.length !== 1) return false;
    if (this.registry.get(making.type)?.descriptor.creation === 'freehand') return false;
    return this.handleCreationClick(pos, viewport);
  }

  /**
   * Take back the point the last press placed on the drawing being made (a
   * second finger landed: the press was the start of a pinch). The tool
   * stays picked. False when nothing is being made.
   */
  takeBackPoint(): boolean {
    if (this.state !== 'creating' || !this.creator.current) return false;
    this.creator.undoPoint();
    this.requestRender?.();
    return true;
  }

  onPointerMove(pos: Point, viewport: ViewportState): boolean {
    const making = this.state === 'creating' ? this.creator.current : null;
    const makingOn = making ? this.viewportFor(making.paneId, viewport) : null;
    if (making && makingOn && this.creator.move(this.creationAnchor(making.type, pos, makingOn, making.paneId), pos)) {
      this.requestRender?.();
      return true;
    }

    if (this.pendingCopy) {
      const { pos: from } = this.pendingCopy;
      if (Math.hypot(pos.x - from.x, pos.y - from.y) < COPY_START_PX) return true;
      this.startCopy();
    }

    if ((this.state === 'moving' || this.state === 'resizing') && this.drag.isActive()) {
      const primary = this.drawings.find((d) => d.id === this.selection.primary);
      // Moved on its own pane's scale, wherever the pointer goes.
      const on = this.viewportFor(primary?.paneId, viewport);
      const edit = primary && on ? this.dragEdit(primary, on) : undefined;
      if (!on || !this.drag.move(pos, on, primary && this.registry.get(primary.type), edit)) return false;
      this.requestRender?.();
      return true;
    }

    return false;
  }

  onPointerUp(): boolean {
    // A freehand stroke ends with the press.
    const released = this.state === 'creating' ? this.creator.release() : null;
    if (released) {
      this.afterCreationStep(released);
      return true;
    }
    if (this.pendingCopy) return this.toggleCopied();
    if (this.copies) {
      this.endCopy();
      return true;
    }
    if (this.state === 'moving' || this.state === 'resizing') {
      // Record undo for the completed move/resize — not for a press that
      // only selected the drawing without moving it.
      const moved = this.drag.end();
      this.batchUndo(() => {
        for (const { before, drawing } of moved) {
          if (!(sameAnchors(drawing.anchors, before.anchors) && sameOptions(drawing.options, before.options))) {
            this.record({ type: 'drawingModify', before, after: cloneDrawing(drawing) });
          }
        }
      });
      this.state = 'selected';
      return true;
    }
    return false;
  }

  // --- Ctrl/⌘-drag to copy ---

  /**
   * A Ctrl/⌘-press at `pos`: on a drawing, dragging copies it (the whole
   * selection when it is selected) and moves the copy, one undo step; let go
   * without moving, the drawing goes in or out of the selection. False on
   * empty chart, so a selection box can start there.
   */
  beginCopyDrag(pos: Point, main: ViewportState, reach: DrawingReach = MOUSE_REACH): boolean {
    if (this.state === 'creating' || this.state === 'moving' || this.state === 'resizing' || this.eraser) return false;
    // On a handle of the selected drawing, Ctrl/⌘ reshapes it with the magnet turned over.
    if (this.beginHandleDrag(pos, main, reach)) return true;
    const id = this.drawingAt(pos, main, reach.line);
    if (!id) return false;
    this.pendingCopy = { pos, id };
    return true;
  }

  /** A press on a handle of the selected, unlocked drawing begins reshaping it. */
  private beginHandleDrag(pos: Point, main: ViewportState, reach: DrawingReach): boolean {
    const scope = this.scopeAt(pos, main);
    const drawing = this.drawings.find((d) => d.id === this.selection.primary);
    if (!scope || !drawing || drawing.locked || !this.shown(drawing) || drawing.paneId !== scope.pane) return false;
    const handle = this.registry.get(drawing.type)?.hitTestAnchor(pos, drawing, scope.viewport, reach.handle) ?? -1;
    if (handle < 0) return false;
    this.state = 'resizing';
    this.drag.beginResize(pos, drawing, handle);
    return true;
  }

  /** Forget a Ctrl/⌘-drag under way (a tool picked, an undo, new drawings): its copies were never made. */
  private dropCopyGesture(): void {
    this.pendingCopy = null;
    const copies = this.copies;
    if (!copies) return;
    this.copies = null;
    this.drag.end();
    this.drawings = this.drawings.filter((d) => !copies.includes(d.id));
    this.deselect(copies);
    if (this.state === 'moving') this.state = 'idle';
  }

  /** The press travelled: copy what it was on and begin moving the copies. */
  private startCopy(): void {
    const { pos, id } = this.pendingCopy!;
    this.pendingCopy = null;
    const sourceIds = this.selection.has(id) ? [id, ...this.getSelectedDrawingIds().filter((other) => other !== id)] : [id];
    const pressed = this.drawings.find((d) => d.id === id);
    // Only what moves with the pointer: the pressed drawing's pane, tools this chart allows.
    const sources = sourceIds
      .map((sourceId) => this.drawings.find((d) => d.id === sourceId))
      .filter((d): d is DrawingState => d !== undefined && this.shown(d) && d.paneId === pressed?.paneId && this.canPasteType(d.type));
    if (sources.length === 0) return;
    // A copy is a drawing of its own: unlocked, and out of the original's group, as a paste is.
    const copies = sources.map((source) => {
      const { group: _group, ...rest } = structuredClone(source);
      return { ...rest, id: newDrawingId(), locked: false };
    });
    this.copySources = new Map(copies.map((c, i) => [c.id, sources[i].anchors.map((a) => ({ ...a }))]));
    this.drawings = [...this.drawings, ...copies];
    this.copies = copies.map((c) => c.id);
    this.selection.only(copies[0].id, this.copies.slice(1));
    this.beginMove(pos, copies[0]);
    this.requestRender?.();
  }

  /** Let go after a copy-drag: the copies, where they ended, are made as one undo step. */
  private endCopy(): void {
    const ids = this.copies!;
    this.copies = null;
    this.drag.end();
    this.state = 'selected';
    const sources = this.copySources;
    this.copySources = new Map();
    const made = ids.map((id) => this.drawings.find((d) => d.id === id)).filter((d): d is DrawingState => d !== undefined);
    // Dragged back onto the original: no copy lying on top of it.
    if (made.every((d) => { const from = sources.get(d.id); return !!from && sameAnchors(d.anchors, from); })) {
      this.drawings = this.drawings.filter((d) => !ids.includes(d.id));
      this.deselect(ids);
      this.requestRender?.();
      return;
    }
    this.batchUndo(() => {
      for (const d of made) this.record({ type: 'drawingCreate', before: null, after: cloneDrawing(d) });
    });
    for (const d of made) this.eventCallback?.('drawingCreate', { id: d.id, type: d.type, drawing: d });
    this.requestRender?.();
  }

  /** Let go of a Ctrl/⌘-press that didn't travel: its drawing goes in or out of the selection. */
  private toggleCopied(): boolean {
    const { id } = this.pendingCopy!;
    this.pendingCopy = null;
    if (this.selection.has(id)) this.deselect([id]);
    else this.addToSelection(id);
    this.requestRender?.();
    return true;
  }

  // --- Arrow keys ---

  /**
   * Move the selection `bars` bars across and `px` pixels down (an arrow
   * key; negative is left and up). Locked drawings stay. A run of presses
   * on the same selection is one undo step. False when nothing moved.
   */
  nudge(bars: number, px: number, main: ViewportState): boolean {
    if (this.state !== 'selected') return false;
    const targets = this.getSelectedDrawingIds()
      .map((id) => this.drawings.find((d) => d.id === id))
      .filter((d): d is DrawingState => d !== undefined && !d.locked && this.shown(d));
    if (targets.length === 0 || (bars === 0 && px === 0)) return false;
    const key = targets.map((d) => d.id).join(',');
    const now = Date.now();
    const last = this.lastNudge;
    const run = last && last.key === key && now - last.at < NUDGE_MERGE_MS && last.action !== null && this.undoRedo?.last() === last.action ? last : null;
    const before = run ? run.before : targets.map(cloneDrawing);
    const moved = targets.filter((d) => {
      const viewport = this.viewportFor(d.paneId, main);
      if (!viewport) return false;
      d.anchors = shiftAnchors(d.anchors, bars, px, viewport);
      return true;
    });
    if (moved.length === 0) return false;
    if (run) this.undoRedo?.dropLast();
    this.batchUndo(() => {
      for (const d of moved) {
        const was = before.find((b) => b.id === d.id);
        if (was) this.record({ type: 'drawingModify', before: was, after: cloneDrawing(d) });
      }
    });
    this.lastNudge = { key, at: now, before, action: this.undoRedo?.last() ?? null };
    for (const d of moved) this.eventCallback?.('drawingUpdate', { id: d.id });
    this.requestRender?.();
    return true;
  }

  /**
   * A key for the drawings (see `drawingShortcut`); true when it was used.
   * Pass `shiftKey` so Caps Lock doesn't read as Shift.
   */
  onKeyDown(key: string, ctrlKey = false, shiftKey?: boolean): boolean {
    const shortcut = drawingShortcut(key, ctrlKey, shiftKey);
    if (!shortcut) return false;
    const primary = this.state === 'selected' ? this.selection.primary : null;
    switch (shortcut) {
      // With nothing to copy or paste the keys are left to the browser.
      case 'copy':
        return primary !== null && this.copySelection() > 0;
      case 'paste':
        return this.paste().length > 0;
      case 'duplicate':
        return primary !== null && this.duplicateDrawing(primary) !== null;
      case 'group':
        return primary !== null && this.groupDrawings(this.getSelectedDrawingIds()) !== null;
      case 'ungroup':
        return this.ungroupSelection();
      case 'front':
      case 'forward':
      case 'backward':
      case 'back':
        return primary !== null && this.moveDrawing(primary, shortcut);
      case 'undo':
        // While drawing, Ctrl+Z takes back the last point, not an older action.
        if (this.state === 'creating' && this.creator.current) {
          this.creator.undoPoint();
          this.requestRender?.();
          return true;
        }
        return this.undo();
      case 'redo':
        return this.redo();
      case 'escape':
        return this.escape();
      case 'delete':
        // Every selected drawing that isn't locked goes, as one undo step.
        return primary !== null && this.removeDrawings(this.getSelectedDrawingIds()) > 0;
      case 'finish': {
        if (this.state !== 'creating' || !this.creator.current) return false;
        const step = this.creator.finish();
        if (step !== 'done') return false;
        this.afterCreationStep(step);
        return true;
      }
    }
  }

  /** Escape: put the eraser away, drop the tool being drawn with, else the selection. */
  private escape(): boolean {
    if (this.eraser) {
      this.setEraser(false);
      return true;
    }
    if (this.state === 'creating') {
      this.setActiveTool(null);
      this.requestRender?.();
      return true;
    }
    if (this.state === 'selected') {
      this.selection.clear();
      this.state = 'idle';
      this.requestRender?.();
      return true;
    }
    return false;
  }

  /** Ungroup every group with a drawing in the selection. */
  private ungroupSelection(): boolean {
    const groups = new Set<string>();
    for (const id of this.getSelectedDrawingIds()) {
      const group = this.drawings.find((d) => d.id === id)?.group;
      if (group) groups.add(group.id);
    }
    for (const group of groups) this.ungroup(group);
    return groups.size > 0;
  }

  // --- Drawing CRUD ---

  getDrawings(): DrawingState[] {
    return this.drawings;
  }

  setDrawings(states: DrawingState[]): void {
    this.dropCopyGesture();
    reserveIds(states);
    this.drawings = this.upgradeLegacyAnchors(states).map((d) => {
      if (!d.options && d.intervals === undefined) return d;
      const options = sanitizeDrawingOptions(this.optionDefs(d.type), d.options);
      return {
        ...d,
        options: Object.keys(options).length > 0 ? options : undefined,
        intervals: cleanIntervals(d.intervals) ?? undefined,
      };
    });
    // What was selected or being edited may be gone, or no longer shown.
    const byId = new Map(this.drawings.map((d) => [d.id, d]));
    this.deselect(this.getSelectedDrawingIds().filter((id) => {
      const drawing = byId.get(id);
      return !drawing || !this.shown(drawing);
    }));
    const ids = new Set(byId.keys());
    for (const id of [...this.edits.keys()]) if (!ids.has(id)) this.edits.delete(id);
    this.requestRender?.();
  }

  // --- Order and groups ---

  /**
   * Draw a drawing on top of the others, under them, or one step up or down
   * (one undo step). False when it is unknown or already there.
   */
  moveDrawing(id: string, to: DrawingOrderMove): boolean {
    const from = this.drawings.findIndex((d) => d.id === id);
    if (from < 0) return false;
    const target = orderTarget(from, this.drawings.length, to);
    if (target === from) return false;
    const before = this.drawings.map((d) => d.id);
    const next = [...this.drawings];
    const [drawing] = next.splice(from, 1);
    next.splice(target, 0, drawing);
    this.drawings = next;
    this.record({ type: 'drawingOrder', before: null, after: null, order: { before, after: next.map((d) => d.id) } });
    this.eventCallback?.('drawingUpdate', { id });
    this.requestRender?.();
    return true;
  }

  /** Every group, its drawings bottom to top. */
  getGroups(): { id: string; name: string; ids: string[] }[] {
    const groups = new Map<string, { id: string; name: string; ids: string[] }>();
    for (const d of this.drawings) {
      if (!d.group) continue;
      const group = groups.get(d.group.id) ?? { id: d.group.id, name: d.group.name, ids: [] };
      group.ids.push(d.id);
      groups.set(d.group.id, group);
    }
    return [...groups.values()];
  }

  /** Change every drawing of a group, as one undo step. */
  private updateGroup(groupId: string, change: (d: DrawingState) => void): boolean {
    const members = this.drawings.filter((d) => d.group?.id === groupId);
    if (members.length === 0) return false;
    this.batchUndo(() => {
      for (const d of members) {
        const before = cloneDrawing(d);
        change(d);
        this.record({ type: 'drawingModify', before, after: cloneDrawing(d) });
        this.eventCallback?.('drawingUpdate', { id: d.id });
      }
    });
    this.requestRender?.();
    return true;
  }

  /**
   * Group drawings (at least two) so they are selected, hidden and locked
   * together; one leaves the group it was in. Returns the group's id, or null.
   */
  groupDrawings(ids: readonly string[], name?: string): string | null {
    const wanted = new Set(ids);
    // Ids of drawings no longer on the chart are passed over.
    const members = this.drawings.filter((d) => wanted.has(d.id));
    if (members.length < 2) return null;
    const { id, number } = newGroupId();
    const group = { id, name: cleanGroupName(name) || `Group ${number}` };
    this.batchUndo(() => {
      for (const d of members) {
        const before = cloneDrawing(d);
        d.group = { ...group };
        this.record({ type: 'drawingModify', before, after: cloneDrawing(d) });
        this.eventCallback?.('drawingUpdate', { id: d.id });
      }
    });
    this.requestRender?.();
    return group.id;
  }

  ungroup(groupId: string): boolean {
    return this.updateGroup(groupId, (d) => { delete d.group; });
  }

  renameGroup(groupId: string, name: string): boolean {
    const clean = cleanGroupName(name);
    return clean.length > 0 && this.updateGroup(groupId, (d) => { d.group = { id: groupId, name: clean }; });
  }

  /** Show or hide a group; hidden, it leaves the selection. */
  setGroupVisible(groupId: string, visible: boolean): boolean {
    const changed = this.updateGroup(groupId, (d) => { d.visible = visible; });
    if (changed && !visible) this.deselect(this.drawings.filter((d) => d.group?.id === groupId).map((d) => d.id));
    return changed;
  }

  setGroupLocked(groupId: string, locked: boolean): boolean {
    return this.updateGroup(groupId, (d) => { d.locked = locked; });
  }

  // --- Tool options ---

  /**
   * The prices of a drawing's lines at `time` (see `DrawingPlugin.priceAt`),
   * or null; as drawn on `viewport`'s scale when given.
   */
  priceAt(id: string, time: number, viewport?: ViewportState): number[] | null {
    const drawing = this.drawings.find((d) => d.id === id);
    if (!drawing) return null;
    const prices = this.registry.get(drawing.type)?.priceAt?.(drawing, time, viewport) ?? null;
    return prices && prices.every(Number.isFinite) ? prices : null;
  }

  /** Whether a drawing has lines an alert can cross. */
  hasPriceLevels(id: string): boolean {
    const drawing = this.drawings.find((d) => d.id === id);
    return !!drawing && typeof this.registry.get(drawing.type)?.priceAt === 'function';
  }

  /** A registered tool's descriptor, or null. */
  getDescriptor(type: DrawingToolType): DrawingPlugin['descriptor'] | null {
    return this.registry.get(type)?.descriptor ?? null;
  }

  /** The options a tool offers (empty for a tool without any). */
  getOptionDefs(type: DrawingToolType): DrawingOptionDefs {
    return this.optionDefs(type) ?? {};
  }

  private optionDefs(type: DrawingToolType) {
    return this.registry.get(type)?.descriptor.options;
  }

  /** A new drawing's options: the tool's defaults, then `explicit`; undefined when none. */
  private initialOptions(type: DrawingToolType, explicit?: DrawingOptions): DrawingOptions | undefined {
    const defs = this.optionDefs(type);
    const options = {
      ...cloneOptions(this.toolDefaults.get(type) ?? {}),
      ...sanitizeDrawingOptions(defs, explicit),
    };
    return Object.keys(options).length > 0 ? options : undefined;
  }

  /** Options every new drawing of `type` starts with; invalid entries are dropped. */
  setToolDefaults(type: DrawingToolType, options: DrawingOptions | null): void {
    const clean = options ? sanitizeDrawingOptions(this.optionDefs(type), options) : {};
    if (Object.keys(clean).length > 0) this.toolDefaults.set(type, clean);
    else this.toolDefaults.delete(type);
  }

  getToolDefaults(type: DrawingToolType): DrawingOptions {
    return cloneOptions(this.toolDefaults.get(type) ?? {});
  }

  /** Every option of a drawing, its tool's defaults filled in; empty for an unknown drawing. */
  getDrawingOptions(id: string): DrawingOptions {
    const drawing = this.drawings.find((d) => d.id === id);
    if (!drawing) return {};
    return resolveDrawingOptions(this.optionDefs(drawing.type), drawing.options);
  }

  /** Change some of a drawing's options (one undo step). False for an unknown drawing. */
  setDrawingOptions(id: string, options: DrawingOptions): boolean {
    return this.updateDrawing(id, { options });
  }

  /**
   * Change a drawing's anchors, style, options or intervals (one undo step,
   * or part of the edit begun with `beginEdit`). Anchors must be as many as
   * it has, with finite times and prices; options are checked against the
   * tool, intervals cleaned (null: every interval). Explicit edits apply to
   * locked drawings too: the lock only stops the pointer.
   */
  updateDrawing(id: string, patch: DrawingPatch): boolean {
    const drawing = this.drawings.find((d) => d.id === id);
    if (!drawing) return false;
    if (patch.anchors) {
      const valid = patch.anchors.length === drawing.anchors.length
        && patch.anchors.every((a) => Number.isFinite(a.time) && Number.isFinite(a.price));
      if (!valid) return false;
    }
    const before = this.edits.has(id) ? null : cloneDrawing(drawing);
    if (patch.anchors) drawing.anchors = patch.anchors.map((a) => ({ time: a.time, price: a.price }));
    if (patch.style) drawing.style = { ...drawing.style, ...patch.style };
    if (patch.options) {
      const options = { ...drawing.options, ...sanitizeDrawingOptions(this.optionDefs(drawing.type), patch.options) };
      drawing.options = Object.keys(options).length > 0 ? options : undefined;
    }
    if (patch.intervals !== undefined) {
      drawing.intervals = cleanIntervals(patch.intervals) ?? undefined;
      // An edit (a settings dialog) may yet be cancelled: it lets go on keeping.
      if (!this.edits.has(id) && !this.shown(drawing)) this.deselect([id]);
    }
    if (before) this.record({ type: 'drawingModify', before, after: cloneDrawing(drawing) });
    this.eventCallback?.('drawingUpdate', { id });
    this.requestRender?.();
    return true;
  }

  /**
   * Start editing a drawing (a settings dialog previewing changes): the
   * `updateDrawing` calls until `endEdit` become one undo step. False for an
   * unknown drawing.
   */
  beginEdit(id: string): boolean {
    const drawing = this.drawings.find((d) => d.id === id);
    if (!drawing) return false;
    if (!this.edits.has(id)) this.edits.set(id, cloneDrawing(drawing));
    return true;
  }

  /** Finish an edit: keep the changes as one undo step, or with `cancel` put the drawing back. */
  endEdit(id: string, { cancel = false }: { cancel?: boolean } = {}): void {
    const before = this.edits.get(id);
    if (!before) return;
    this.edits.delete(id);
    const index = this.drawings.findIndex((d) => d.id === id);
    if (index < 0) return;
    if (cancel) {
      this.drawings[index] = before;
      this.requestRender?.();
    } else if (JSON.stringify(before) !== JSON.stringify(this.drawings[index])) {
      this.record({ type: 'drawingModify', before, after: cloneDrawing(this.drawings[index]) });
    }
    if (!this.shown(this.drawings[index])) this.deselect([id]);
    this.eventCallback?.('drawingUpdate', { id });
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
    if (state.id) reserveIds([{ id: state.id }]);
    const id = state.id ?? newDrawingId();
    const drawing: DrawingState = {
      id,
      type: state.type,
      anchors: state.anchors.map((a) => ({ ...a })),
      style: { ...this.activeStyle, ...state.style },
      visible: state.visible ?? true,
      locked: state.locked ?? false,
      options: this.initialOptions(state.type, state.options),
      intervals: cleanIntervals(state.intervals) ?? undefined,
      meta: state.meta,
      ...(typeof state.paneId === 'string' ? { paneId: state.paneId } : {}),
    };
    this.drawings = [...this.drawings, drawing];
    this.record({ type: 'drawingCreate', before: null, after: cloneDrawing(drawing) });
    this.eventCallback?.('drawingCreate', { id, type: drawing.type, drawing });
    this.requestRender?.();
    return id;
  }

  /**
   * Auto-migrate legacy bar-index anchors to real timestamps when data is
   * available. Heuristic: anchors below `LEGACY_INDEX_LIMIT` (ten million)
   * are bar indices, as long as the bars carry timestamps; a time in seconds
   * passes that from April 1970 on, so old dates (a 2000 bar is below 1e9
   * seconds) stay times. Upgraded by looking up the bar's timestamp; anchors
   * that already look like timestamps pass through untouched. Idempotent.
   */
  private upgradeLegacyAnchors(states: DrawingState[]): DrawingState[] {
    const data = this.dataGetter?.();
    if (!data || data.length === 0) return states;
    const TIMESTAMP_THRESHOLD = LEGACY_INDEX_LIMIT;
    // Bars timed by index themselves (tests, synthetic series): nothing to upgrade.
    if (data[data.length - 1].time < TIMESTAMP_THRESHOLD) return states;
    return states.map(d => ({
      ...d,
      anchors: d.anchors.map(a => {
        // Only a finite, non-negative small number is an old bar index.
        if (!Number.isFinite(a.time) || a.time < 0 || a.time >= TIMESTAMP_THRESHOLD) return a;
        const idx = Math.max(0, Math.min(data.length - 1, Math.round(a.time)));
        return { ...a, time: data[idx].time };
      }),
    }));
  }

  removeDrawing(id: string): void {
    const index = this.drawings.findIndex((d) => d.id === id);
    const removed = this.drawings[index];
    this.drawings = this.drawings.filter((d) => d.id !== id);
    if (removed) {
      this.record({
        type: 'drawingRemove',
        before: structuredClone(removed),
        after: null,
        index,
      });
    }
    this.deselect([id]);
    this.edits.delete(id);
    this.eventCallback?.('drawingRemove', { id });
    this.requestRender?.();
  }

  /**
   * Remove drawings as one undo step; locked ones stay. Returns how many
   * went.
   */
  removeDrawings(ids: readonly string[]): number {
    const removable = [...new Set(ids)].filter((id) => {
      const drawing = this.drawings.find((d) => d.id === id);
      return drawing !== undefined && !drawing.locked;
    });
    if (removable.length === 0) return 0;
    this.batchUndo(() => { for (const id of removable) this.removeDrawing(id); });
    return removable.length;
  }

  /**
   * Take back a drawing just made (the prompt for its text cancelled): with
   * its undo step when that is the last one, so nothing is left to undo or
   * redo; else removed as a step of its own.
   */
  takeBack(id: string): void {
    const last = this.undoRedo?.last();
    if (!this.undoRedo || last?.type !== 'drawingCreate' || last.after?.id !== id) {
      this.removeDrawing(id);
      return;
    }
    this.undoRedo.dropLast();
    this.drawings = this.drawings.filter((d) => d.id !== id);
    this.deselect([id]);
    this.edits.delete(id);
    this.eventCallback?.('drawingRemove', { id });
    this.requestRender?.();
  }

  duplicateDrawing(id: string): string | null {
    const drawing = this.drawings.find(d => d.id === id);
    if (!drawing) return null;

    const newDrawing: DrawingState = structuredClone(drawing);
    newDrawing.id = newDrawingId();
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
    this.record({
      type: 'drawingCreate',
      before: null,
      after: structuredClone(newDrawing),
    });
    this.selection.only(newDrawing.id);
    this.state = 'selected';
    this.eventCallback?.('drawingCreate', { id: newDrawing.id, type: newDrawing.type, drawing: newDrawing });
    this.requestRender?.();
    return newDrawing.id;
  }

  clearDrawings(): void {
    this.dropCopyGesture();
    this.drawings = [];
    this.selection.clear();
    this.state = 'idle';
    this.requestRender?.();
  }

  getSelectedDrawingId(): string | null {
    return this.selection.primary;
  }

  // --- Render ---

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState): void {
    // Each drawing is clipped to its own pane's plot (renderIsolated).
    ctx.save();
    // The context carries its text state over from the last frame, and the
    // time axis, drawn after the drawings, leaves it right-aligned. Each pass
    // starts from the canvas's own baseline and a left alignment instead.
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    for (const drawing of this.drawings) {
      if (!this.shown(drawing)) continue;
      const plugin = this.registry.get(drawing.type);
      const on = this.viewportFor(drawing.paneId, viewport);
      if (plugin && on) renderIsolated(ctx, plugin, drawing, on, this.selection.has(drawing.id));
    }

    // The drawing being made, with the anchor under the pointer.
    const preview = this.creator.previewState();
    const previewPlugin = preview ? this.registry.get(preview.type) : undefined;
    const previewOn = preview ? this.viewportFor(preview.paneId, viewport) : null;
    if (preview && previewPlugin && previewOn) renderIsolated(ctx, previewPlugin, preview, previewOn, false);

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

  /** Where a press or move puts an anchor: magnet-snapped, except for a freehand stroke. */
  private creationAnchor(type: DrawingToolType, pos: Point, viewport: ViewportState, paneId?: string): AnchorPoint {
    const time = xToTime(pos.x, viewport);
    const price = yToPrice(pos.y, viewport);
    if (this.registry.get(type)?.descriptor.creation === 'freehand') return { time, price };
    // Shift keeps the next point at 45° steps from the last one; the magnet would pull it off the angle.
    const placed = this.creator.current?.anchors;
    const last = placed && placed.length > 0 ? placed[placed.length - 1] : undefined;
    if (this.mods.shift && last && keepsAngle(type)) return constrainedAnchor(last, pos, viewport);
    return this.snapToOHLC(time, price, viewport, paneId);
  }

  private handleCreationClick(pos: Point, viewport: ViewportState): boolean {
    const type = this.activeTool;
    const plugin = type ? this.registry.get(type) : undefined;
    if (!type || !plugin) return false;
    // A drawing being made stays on the pane it was begun on; a new one begins on the pane pressed.
    const making = this.creator.current;
    const pane = making ? making.paneId : this.paneAt(pos);
    if (pane === null) return false;
    if (pane !== undefined && plugin.descriptor.priceOnly) return false;
    const on = this.viewportFor(pane, viewport);
    if (!on) return false;
    const start = (): DrawingState => ({
      id: newDrawingId(),
      type,
      anchors: [],
      style: { ...this.activeStyle },
      visible: true,
      locked: false,
      options: this.initialOptions(type),
      ...(pane !== undefined ? { paneId: pane } : {}),
    });
    this.creationPressAt = Date.now();
    const onScreen = (a: AnchorPoint): Point => ({ x: timeToX(a.time, on), y: priceToY(a.price, on) });
    this.afterCreationStep(this.creator.press(plugin, start, this.creationAnchor(type, pos, on, pane), pos, onScreen));
    return true;
  }

  private afterCreationStep(step: CreationStep): void {
    if (step === 'done') this.finalizeCreation();
    else if (step === 'cancel') this.creator.reset();
    this.requestRender?.();
  }

  /**
   * Turn the eraser on or off: while on, a click on a drawing (not a locked
   * one) removes it, one undo step each. Picking a tool or Escape turns it off.
   */
  setEraser(on: boolean): void {
    if (on === this.eraser) return;
    this.eraser = on;
    if (on) {
      this.setActiveTool(null);
      this.selection.clear();
      this.state = 'idle';
    }
    this.eventCallback?.('toolModeChange', { eraser: on });
    this.requestRender?.();
  }

  isEraser(): boolean {
    return this.eraser;
  }

  /** The eraser at `pos`: remove the drawing there. A press off any drawing is left to the chart (a pan). */
  private erase(pos: Point, scope: { pane: string | undefined; viewport: ViewportState }, tolerance: number): boolean {
    const id = this.erasableAt(pos, scope, tolerance);
    if (!id) return false;
    this.removeDrawing(id);
    return true;
  }

  /** The topmost drawing the eraser would take at `pos`: locked ones are passed over. */
  private erasableAt(pos: Point, scope: { pane: string | undefined; viewport: ViewportState }, tolerance = MOUSE_REACH.line): string | null {
    for (let i = this.drawings.length - 1; i >= 0; i--) {
      const d = this.drawings[i];
      if (!this.shown(d) || d.locked || d.paneId !== scope.pane) continue;
      if (this.registry.get(d.type)?.hitTest(pos, d, scope.viewport, tolerance)) return d.id;
    }
    return null;
  }

  /**
   * Whether a press that drew just finished a drawing: the double-click that
   * ended a path isn't a double-click on it. A drawing finished earlier can be
   * double-clicked straight away.
   */
  justFinished(withinMs = 500): boolean {
    return Date.now() - this.creationPressAt < withinMs && this.finishedAt >= this.creationPressAt;
  }

  private finalizeCreation(): void {
    const drawing = this.creator.take();
    if (!drawing) return;
    this.finishedAt = Date.now();
    this.drawings.push(drawing);
    this.selection.only(drawing.id);
    this.record({ type: 'drawingCreate', before: null, after: structuredClone(drawing) });
    this.eventCallback?.('drawingCreate', { id: drawing.id, type: drawing.type, drawing, drawn: true });
    if (this.stayInDrawingMode && this.activeTool) {
      // Ready for the next one; selecting the finished drawing would get in the way.
      this.selection.clear();
      this.state = 'creating';
      return;
    }
    this.activeTool = null;
    this.state = 'selected';
    this.eventCallback?.('drawingToolChange', { tool: null });
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
  /** The topmost visible drawing under `pos` (locked ones too), or null. */
  drawingAt(pos: Point, viewport: ViewportState, tolerance = MOUSE_REACH.line): string | null {
    const scope = this.scopeAt(pos, viewport);
    if (!scope) return null;
    for (let i = this.drawings.length - 1; i >= 0; i--) {
      const d = this.drawings[i];
      if (!this.shown(d) || d.paneId !== scope.pane) continue;
      if (this.registry.get(d.type)?.hitTest(pos, d, scope.viewport, tolerance)) return d.id;
    }
    return null;
  }

  hoverCursorAt(pos: Point, main: ViewportState): 'move' | 'pointer' | null {
    const scope = this.scopeAt(pos, main);
    if (!scope) return null;
    if (this.eraser) return this.erasableAt(pos, scope) ? 'pointer' : null;
    if (this.activeTool || this.state === 'creating') return null;
    const tolerance = MOUSE_REACH.line;
    const viewport = scope.viewport;
    if (this.selection.primary) {
      const selected = this.drawings.find((d) => d.id === this.selection.primary);
      const plugin = selected && this.shown(selected) && !selected.locked && selected.paneId === scope.pane ? this.registry.get(selected.type) : undefined;
      if (selected && plugin && plugin.hitTestAnchor(pos, selected, viewport, tolerance) >= 0) return 'move';
    }
    for (let i = this.drawings.length - 1; i >= 0; i--) {
      const d = this.drawings[i];
      if (!this.shown(d) || d.locked || d.paneId !== scope.pane) continue;
      const plugin = this.registry.get(d.type);
      if (plugin?.hitTest(pos, d, viewport, tolerance)) return 'pointer';
    }
    return null;
  }

  private handleSelectionClick(pos: Point, main: ViewportState, reach: DrawingReach): boolean {
    const tolerance = reach.line;
    const scope = this.scopeAt(pos, main);
    if (!scope) return false;
    const viewport = scope.viewport;

    // If already selected, check for anchor drag
    if (this.selection.primary) {
      const drawing = this.drawings.find((d) => d.id === this.selection.primary);
      if (drawing && this.shown(drawing) && !drawing.locked && drawing.paneId === scope.pane) {
        const plugin = this.registry.get(drawing.type);
        if (plugin) {
          const anchorIdx = plugin.hitTestAnchor(pos, drawing, viewport, reach.handle);
          if (anchorIdx >= 0) {
            this.state = 'resizing';
            this.drag.beginResize(pos, drawing, anchorIdx);
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
      if (!this.shown(drawing) || drawing.paneId !== scope.pane) continue;
      const plugin = this.registry.get(drawing.type);
      if (!plugin) continue;
      if (plugin.hitTest(pos, drawing, viewport, tolerance)) {
        // Part of the selection: it becomes the primary, the rest stays. Else it
        // is selected with its group.
        if (this.selection.has(drawing.id)) this.selection.focus(drawing.id);
        else this.selection.only(drawing.id, this.groupMates(drawing));
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
    if (this.selection.primary) {
      this.selection.clear();
      this.state = 'idle';
      this.requestRender?.();
    }
    return false;
  }
}

/**
 * One drawing in a save/restore of its own, so the alignment, alpha or dash
 * it sets, a host's drawing plugin included, never reaches the next one.
 * Clipped to its pane's plot: off the axes, and off the other panes.
 */
function renderIsolated(
  ctx: CanvasRenderingContext2D,
  plugin: DrawingPlugin,
  state: DrawingState,
  viewport: ViewportState,
  selected: boolean,
): void {
  const plot = viewport.chartRect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(plot.x, plot.y, plot.width, plot.height);
  ctx.clip();
  plugin.render(ctx, state, viewport, selected);
  ctx.restore();
}

/** A group name as kept: trimmed and at most `MAX_GROUP_NAME` long. */
function cleanGroupName(name: string | undefined): string {
  return (name ?? '').trim().slice(0, MAX_GROUP_NAME);
}
