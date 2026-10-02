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
import { snapToBar, type MagnetMode } from './magnetSnap.js';
import { DrawingSelection } from './DrawingSelection.js';
import { DrawingDrag } from './DrawingDrag.js';

export type { DrawingOrderMove, DrawingPatch } from './drawingState.js';

type DrawingEventCallback = (event: string, data: unknown) => void;

export type DrawingInteractionState = 'idle' | 'creating' | 'selected' | 'moving' | 'resizing';
export type { MagnetMode } from './magnetSnap.js';

/**
 * Copied drawings, shared by every chart on the page so a copy can be pasted
 * into another chart. `pastes` counts pastes since the copy, to stagger them.
 */
const clipboard: { drawings: DrawingState[]; pastes: number } = { drawings: [], pastes: 0 };


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
  /** When the last drawing was finished (ms): the double-click that ends one isn't a double-click on it. */
  private finishedAt = -Infinity;
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
  private dataGetter: (() => OHLCBar[]) | null = null;
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

  register(plugin: DrawingPlugin): void {
    this.registry.set(plugin.descriptor.type, plugin);
    if (this.dataGetter) plugin.setDataGetter?.(this.dataGetter);
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

  /** The chart's bars, for legacy anchors and the tools drawn from bars. */
  setDataGetter(getter: () => OHLCBar[]): void {
    this.dataGetter = getter;
    for (const plugin of this.registry.values()) plugin.setDataGetter?.(getter);
  }

  /** Set a separate getter for display data (e.g. Heikin Ashi transformed). Used by magnet snap. */
  setDisplayDataGetter(getter: () => OHLCBar[]): void {
    this.displayDataGetter = getter;
  }

  // --- Magnet snap ---

  /** Snap a point being placed to the bar under it (see `snapToBar`), on the bars as drawn (Heikin Ashi, say). */
  private snapToOHLC(time: number, price: number, viewport?: ViewportState): AnchorPoint {
    const bars = this.magnetMode === 'none' ? [] : this.displayDataGetter?.() ?? this.dataGetter?.() ?? [];
    return snapToBar(time, price, this.magnetMode, bars, viewport);
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

  private applyUndoAction(action: UndoableAction): void {
    this.applyHistory(undoAction(this.drawings, action));
  }

  private applyRedoAction(action: UndoableAction): void {
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

  /** The other drawings of `drawing`'s group (selected along with it). */
  private groupMates(drawing: DrawingState): string[] {
    const group = drawing.group?.id;
    return group ? this.drawings.filter((d) => d.group?.id === group && d.id !== drawing.id).map((d) => d.id) : [];
  }

  /**
   * Select a drawing and the rest of its group (a menu opened on it, say). A
   * drawing already in the selection leaves the selection as it is. False
   * for an unknown or hidden drawing, or while a drawing is being drawn.
   */
  select(id: string): boolean {
    if (this.state === 'creating') return false;
    const drawing = this.drawings.find((d) => d.id === id);
    if (!drawing || !drawing.visible) return false;
    if (!this.selection.has(id)) this.selection.only(id, this.groupMates(drawing));
    this.state = 'selected';
    this.requestRender?.();
    return true;
  }

  /** Ids of every selected drawing, the primary one first. */
  getSelectedDrawingIds(): string[] {
    return this.selection.ids();
  }

  /**
   * Select every visible drawing with an anchor inside the pixel rectangle
   * (the Ctrl/⌘-drag selection). Replaces the current selection.
   * Returns how many were selected.
   */
  selectInRect(rect: { x0: number; y0: number; x1: number; y1: number }, viewport: ViewportState): number {
    if (this.state === 'creating') return 0;
    this.selection.clear();
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
      .filter((d): d is DrawingState => d !== undefined && !d.locked);
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
        if (!this.registry.has(source.type) || !this.toolAllowed(source.type)) continue;
        ids.push(this.addDrawing({
          type: source.type,
          anchors: source.anchors.map((a) => ({ ...a, time: a.time + shift })),
          style: { ...source.style },
          options: source.options ? cloneOptions(source.options) : undefined,
          meta: source.meta ? structuredClone(source.meta) : undefined,
        }));
      }
    });
    if (ids.length === 0) return ids;
    this.selection.clear();
    for (const id of ids) this.addToSelection(id);
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

  onPointerDown(pos: Point, viewport: ViewportState): boolean {
    if (this.eraser) return this.erase(pos, viewport);
    if (this.state === 'creating' && this.activeTool) {
      return this.handleCreationClick(pos, viewport);
    }

    if (this.state === 'idle' || this.state === 'selected') {
      return this.handleSelectionClick(pos, viewport);
    }

    return false;
  }

  onPointerMove(pos: Point, viewport: ViewportState): boolean {
    const making = this.state === 'creating' ? this.creator.current : null;
    if (making && this.creator.move(this.creationAnchor(making.type, pos, viewport), pos)) {
      this.requestRender?.();
      return true;
    }

    if ((this.state === 'moving' || this.state === 'resizing') && this.drag.isActive()) {
      const primary = this.drawings.find((d) => d.id === this.selection.primary);
      if (!this.drag.move(pos, viewport, primary && this.registry.get(primary.type))) return false;
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
    reserveIds(states);
    this.drawings = this.upgradeLegacyAnchors(states).map((d) => {
      if (!d.options) return d;
      const options = sanitizeDrawingOptions(this.optionDefs(d.type), d.options);
      return { ...d, options: Object.keys(options).length > 0 ? options : undefined };
    });
    // What was selected or being edited may be gone.
    const ids = new Set(this.drawings.map((d) => d.id));
    this.deselect(this.getSelectedDrawingIds().filter((id) => !ids.has(id)));
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
   * Change a drawing's anchors, style or options (one undo step, or part of
   * the edit begun with `beginEdit`). Anchors must be as many as it has, with
   * finite times and prices; options are checked against the tool. Explicit
   * edits apply to locked drawings too: the lock only stops the pointer.
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
      meta: state.meta,
    };
    this.drawings = [...this.drawings, drawing];
    this.record({ type: 'drawingCreate', before: null, after: cloneDrawing(drawing) });
    this.eventCallback?.('drawingCreate', { id, type: drawing.type, drawing });
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
    // Clip to chart area so drawings don't bleed into axis areas
    ctx.save();
    ctx.beginPath();
    ctx.rect(viewport.chartRect.x, viewport.chartRect.y, viewport.chartRect.width, viewport.chartRect.height);
    ctx.clip();

    for (const drawing of this.drawings) {
      if (!drawing.visible) continue;
      const plugin = this.registry.get(drawing.type);
      if (!plugin) continue;
      const isSelected = this.selection.has(drawing.id);
      plugin.render(ctx, drawing, viewport, isSelected);
    }

    // The drawing being made, with the anchor under the pointer.
    const preview = this.creator.previewState();
    if (preview) this.registry.get(preview.type)?.render(ctx, preview, viewport, false);

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
  private creationAnchor(type: DrawingToolType, pos: Point, viewport: ViewportState): AnchorPoint {
    const time = xToTime(pos.x, viewport);
    const price = yToPrice(pos.y, viewport);
    return this.registry.get(type)?.descriptor.creation === 'freehand' ? { time, price } : this.snapToOHLC(time, price, viewport);
  }

  private handleCreationClick(pos: Point, viewport: ViewportState): boolean {
    const type = this.activeTool;
    const plugin = type ? this.registry.get(type) : undefined;
    if (!type || !plugin) return false;
    const start = (): DrawingState => ({
      id: newDrawingId(),
      type,
      anchors: [],
      style: { ...this.activeStyle },
      visible: true,
      locked: false,
      options: this.initialOptions(type),
    });
    this.afterCreationStep(this.creator.press(plugin, start, this.creationAnchor(type, pos, viewport), pos));
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
  private erase(pos: Point, viewport: ViewportState): boolean {
    const id = this.drawingAt(pos, viewport);
    const drawing = id ? this.drawings.find((d) => d.id === id) : undefined;
    if (!drawing || drawing.locked) return false;
    this.removeDrawing(drawing.id);
    return true;
  }

  /** Whether a drawing was just finished: the double-click that ended a path, say. */
  justFinished(withinMs = 500): boolean {
    return Date.now() - this.finishedAt < withinMs;
  }

  private finalizeCreation(): void {
    const drawing = this.creator.take();
    if (!drawing) return;
    this.finishedAt = Date.now();
    this.drawings.push(drawing);
    this.selection.only(drawing.id);
    this.record({ type: 'drawingCreate', before: null, after: structuredClone(drawing) });
    this.eventCallback?.('drawingCreate', { id: drawing.id, type: drawing.type, drawing });
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
  drawingAt(pos: Point, viewport: ViewportState, tolerance = 8): string | null {
    for (let i = this.drawings.length - 1; i >= 0; i--) {
      const d = this.drawings[i];
      if (!d.visible) continue;
      if (this.registry.get(d.type)?.hitTest(pos, d, viewport, tolerance)) return d.id;
    }
    return null;
  }

  hoverCursorAt(pos: Point, viewport: ViewportState): 'move' | 'pointer' | null {
    if (this.eraser) return this.drawingAt(pos, viewport) ? 'pointer' : null;
    if (this.activeTool || this.state === 'creating') return null;
    const tolerance = 8;
    if (this.selection.primary) {
      const selected = this.drawings.find((d) => d.id === this.selection.primary);
      const plugin = selected && selected.visible && !selected.locked ? this.registry.get(selected.type) : undefined;
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
    if (this.selection.primary) {
      const drawing = this.drawings.find((d) => d.id === this.selection.primary);
      if (drawing && drawing.visible && !drawing.locked) {
        const plugin = this.registry.get(drawing.type);
        if (plugin) {
          const anchorIdx = plugin.hitTestAnchor(pos, drawing, viewport, tolerance);
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
      if (!drawing.visible) continue;
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

/** A group name as kept: trimmed and at most `MAX_GROUP_NAME` long. */
function cleanGroupName(name: string | undefined): string {
  return (name ?? '').trim().slice(0, MAX_GROUP_NAME);
}
