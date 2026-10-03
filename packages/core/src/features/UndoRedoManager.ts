import type { DrawingState } from '@tradecanvas/commons';
import type { SnapshotIndicator } from './ChartState.js';

export interface UndoableAction {
  /** `'indicators'`: the chart's indicators changed (added, removed, edited, moved between panes). */
  type: 'drawingCreate' | 'drawingRemove' | 'drawingModify' | 'drawingBatch' | 'drawingOrder' | 'indicators';
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
}

export class UndoRedoManager {
  private undoStack: UndoableAction[] = [];
  private redoStack: UndoableAction[] = [];
  private maxHistory = 50;
  private onChange: (() => void) | null = null;

  setOnChange(cb: () => void): void {
    this.onChange = cb;
  }

  push(action: UndoableAction): void {
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

  /** The step an undo would take back, or null. */
  last(): UndoableAction | null {
    return this.undoStack[this.undoStack.length - 1] ?? null;
  }

  /** Put `action` in place of the last step (a burst of edits as one step); nothing to redo after it. */
  replaceLast(action: UndoableAction): void {
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
