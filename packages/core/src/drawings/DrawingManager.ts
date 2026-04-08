import type {
  DrawingPlugin,
  DrawingState,
  DrawingToolType,
  DrawingStyle,
  Point,
  ViewportState,
  OHLCBar,
} from '@chart-lib/commons';
import { xToBarIndex, yToPrice } from '../viewport/ScaleMapping.js';
import type { UndoRedoManager } from '../features/UndoRedoManager.js';

type DrawingEventCallback = (event: string, data: unknown) => void;

export type DrawingInteractionState = 'idle' | 'creating' | 'selected' | 'moving' | 'resizing';
export type MagnetMode = 'none' | 'magnet';

let nextDrawingId = 1;

export class DrawingManager {
  private registry = new Map<DrawingToolType, DrawingPlugin>();
  private drawings: DrawingState[] = [];
  private state: DrawingInteractionState = 'idle';
  private activeTool: DrawingToolType | null = null;
  private activeStyle: DrawingStyle = {
    color: '#2196F3',
    lineWidth: 1,
    lineStyle: 'solid',
    fillColor: 'rgba(33, 150, 243, 0.1)',
    fillOpacity: 0.1,
    fontSize: 12,
  };
  private creatingDrawing: DrawingState | null = null;
  private committedAnchors = 0; // how many anchors have been clicked (not preview)
  private previewAnchor: { time: number; price: number } | null = null;
  private selectedDrawingId: string | null = null;
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

  private snapToOHLC(barIndex: number, price: number, viewport?: ViewportState): { time: number; price: number } {
    if (this.magnetMode === 'none' || !this.dataGetter) {
      return { time: barIndex, price };
    }
    // Use display data for magnet snap (matches what's visually rendered, e.g. Heikin Ashi)
    const data = this.displayDataGetter?.() ?? this.dataGetter();
    const idx = Math.round(barIndex);
    if (idx < 0 || idx >= data.length) return { time: barIndex, price };
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
    // Convert price distance to pixels to decide
    if (viewport) {
      const pxPerPrice = viewport.chartRect.height / (viewport.priceRange.max - viewport.priceRange.min || 1);
      const distPx = minDist * pxPerPrice;
      if (distPx > 30) {
        // Too far — don't snap, use raw position
        return { time: idx, price };
      }
    }

    return { time: idx, price: closest };
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
    switch (action.type) {
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
    this.selectedDrawingId = null;
    this.state = 'idle';
    this.requestRender?.();
  }

  private applyRedoAction(action: import('../features/UndoRedoManager.js').UndoableAction): void {
    switch (action.type) {
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
    this.selectedDrawingId = null;
    this.state = 'idle';
    this.requestRender?.();
  }

  // --- Bulk operations (TradingView-like) ---

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
    this.selectedDrawingId = null;
    this.state = 'idle';
    this.requestRender?.();
  }

  showAllDrawings(): void {
    for (const d of this.drawings) d.visible = true;
    this.requestRender?.();
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
        const rawIdx = xToBarIndex(pos.x, viewport);
        const rawPrice = yToPrice(pos.y, viewport);
        this.previewAnchor = this.snapToOHLC(rawIdx, rawPrice, viewport);
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
      // Record undo for the completed move/resize
      if (this.dragBeforeState && this.selectedDrawingId) {
        const drawing = this.drawings.find(d => d.id === this.selectedDrawingId);
        if (drawing) {
          this.undoRedo?.push({
            type: 'drawingModify',
            before: this.dragBeforeState,
            after: structuredClone(drawing),
          });
        }
      }
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
        this.selectedDrawingId = null;
        this.state = 'idle';
        this.requestRender?.();
        return true;
      }
    }
    if (key === 'Delete' || key === 'Backspace') {
      if (this.state === 'selected' && this.selectedDrawingId) {
        const drawing = this.drawings.find(d => d.id === this.selectedDrawingId);
        if (drawing?.locked) return false; // Can't delete locked drawings
        this.removeDrawing(this.selectedDrawingId);
        this.selectedDrawingId = null;
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
    this.drawings = states;
    this.requestRender?.();
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
    newDrawing.id = `drawing_${nextDrawingId++}`;
    // Offset X by 3 bars so copy is visually distinct
    newDrawing.anchors = newDrawing.anchors.map(a => ({
      ...a,
      time: a.time + 3,
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
    this.selectedDrawingId = null;
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
      const isSelected = drawing.id === this.selectedDrawingId;
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

  private handleCreationClick(pos: Point, viewport: ViewportState): boolean {
    if (!this.activeTool) return false;
    const plugin = this.registry.get(this.activeTool);
    if (!plugin) return false;

    const rawBarIdx = xToBarIndex(pos.x, viewport);
    const rawPrice = yToPrice(pos.y, viewport);
    const anchor = this.snapToOHLC(rawBarIdx, rawPrice, viewport);

    if (!this.creatingDrawing) {
      // First click: start creation
      this.creatingDrawing = {
        id: `drawing_${nextDrawingId++}`,
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
            this.dragBeforeState = structuredClone(drawing);
            return true;
          }
          if (plugin.hitTest(pos, drawing, viewport, tolerance)) {
            this.state = 'moving';
            this.dragStartPoint = pos;
            this.dragStartAnchors = drawing.anchors.map((a) => ({ ...a }));
            this.dragBeforeState = structuredClone(drawing);
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
        this.selectedDrawingId = drawing.id;
        this.state = 'selected';
        this.requestRender?.();
        return true;
      }
    }

    // Clicked empty space — deselect
    if (this.selectedDrawingId) {
      this.selectedDrawingId = null;
      this.state = 'idle';
      this.requestRender?.();
    }
    return false;
  }

  private handleMove(pos: Point, viewport: ViewportState): boolean {
    const drawing = this.drawings.find((d) => d.id === this.selectedDrawingId);
    if (!drawing || !this.dragStartPoint) return false;

    const dxBar = xToBarIndex(pos.x, viewport) - xToBarIndex(this.dragStartPoint.x, viewport);
    const dPrice = yToPrice(pos.y, viewport) - yToPrice(this.dragStartPoint.y, viewport);

    drawing.anchors = this.dragStartAnchors.map((a) => ({
      time: a.time + dxBar,
      price: a.price + dPrice,
    }));

    this.requestRender?.();
    return true;
  }

  private handleResize(pos: Point, viewport: ViewportState): boolean {
    const drawing = this.drawings.find((d) => d.id === this.selectedDrawingId);
    if (!drawing || this.dragAnchorIndex < 0) return false;

    drawing.anchors[this.dragAnchorIndex] = {
      time: xToBarIndex(pos.x, viewport),
      price: yToPrice(pos.y, viewport),
    };

    this.requestRender?.();
    return true;
  }
}
