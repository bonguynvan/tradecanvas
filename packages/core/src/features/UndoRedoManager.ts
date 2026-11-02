import type { DrawingState } from '@tradecanvas/commons';
import type { SnapshotIndicator } from './ChartState.js';

export interface UndoableAction {
  /** `'indicators'`: the chart's indicators changed (added, removed, edited, moved between panes). */
  type: 'drawingCreate' | 'drawingRemove' | 'drawingModify' | 'drawingBatch' | 'drawingOrder' | 'indicators' | 'custom';
  /** State before the action (null for create) */
  before: DrawingState | null;
  /** State after the action (null for remove) */
  after: DrawingState | null;
  /** For 'drawingBatch': the actions undone/redone together as one step. */
  actions?: UndoableAction[];
  /** For 'drawingRemove': where the drawing was, so undo puts it back there. */
  index?: number;
  /** For 'drawingOrder': the drawings' ids, bottom to top, before and after. */
  order?: { before: string[]; after: string[] };
  /** For 'indicators': the indicators before and after, and what changed (to merge a burst of edits). */
  indicators?: { before: SnapshotIndicator[]; after: SnapshotIndicator[]; subject?: string; at?: number };
  /** For 'custom': a change recorded by its owner (`Chart.recordUndo`), and what it was about (to merge a burst). */
  custom?: { undo: () => void; redo: () => void; subject?: string; at: number };
}

export class UndoRedoManager {
  private undoStack: UndoableAction[] = [];
  private redoStack: UndoableAction[] = [];
  private maxHistory = 50;
  private onChange: (() => void) | null = null;
  /** The steps pushed inside `group`, kept to become one. */
  private grouped: UndoableAction[] | null = null;

  setOnChange(cb: () => void): void {
    this.onChange = cb;
  }

  push(action: UndoableAction): void {
    if (this.grouped) {
      this.grouped.push(action);
      return;
    }
    this.undoStack.push(action);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    // Any new action clears the redo stack
    this.redoStack.length = 0;
    this.onChange?.();
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undo(): UndoableAction | null {
    const action = this.undoStack.pop();
    if (!action) return null;
    this.redoStack.push(action);
    this.onChange?.();
    return action;
  }

  redo(): UndoableAction | null {
    const action = this.redoStack.pop();
    if (!action) return null;
    this.undoStack.push(action);
    this.onChange?.();
    return action;
  }

  clear(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.onChange?.();
  }

  /**
   * Run `fn`, keeping every step it pushes as one: an undo takes them all
   * back, a redo makes them all again. A group inside a group joins it.
   * Returns what `fn` returns. When `fn` throws, what it changed before that
   * is still kept as one step, and the error goes on.
   */
  group<T>(fn: () => T): T {
    if (this.grouped) return fn();
    const steps: UndoableAction[] = [];
    this.grouped = steps;
    try {
      return fn();
    } finally {
      this.grouped = null;
      if (steps.length === 1) this.push(steps[0]);
      else if (steps.length > 1) this.push({ type: 'drawingBatch', before: null, after: null, actions: steps });
    }
  }

  /** The step an undo would take back, or null; inside `group`, the group's last. */
  last(): UndoableAction | null {
    if (this.grouped) return this.grouped[this.grouped.length - 1] ?? null;
    return this.undoStack[this.undoStack.length - 1] ?? null;
  }

  /** Forget the last step (nothing to redo after it either). */
  dropLast(): void {
    if (this.grouped) {
      this.grouped.pop();
      return;
    }
    if (this.undoStack.pop()) {
      this.redoStack.length = 0;
      this.onChange?.();
    }
  }

  /** Put `action` in place of the last step (a burst of edits as one step); nothing to redo after it. */
  replaceLast(action: UndoableAction): void {
    if (this.grouped) {
      // An empty group has no last step of its own: the step joins it.
      if (this.grouped.length > 0) this.grouped[this.grouped.length - 1] = action;
      else this.grouped.push(action);
      return;
    }
    if (this.undoStack.length === 0) {
      this.push(action);
      return;
    }
    this.undoStack[this.undoStack.length - 1] = action;
    this.redoStack.length = 0;
    this.onChange?.();
  }

  getState(): { canUndo: boolean; canRedo: boolean; undoCount: number; redoCount: number } {
    return {
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0,
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
    };
  }
}
