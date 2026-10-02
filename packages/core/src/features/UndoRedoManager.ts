import type { DrawingState } from '@tradecanvas/commons';

export interface UndoableAction {
  type: 'drawingCreate' | 'drawingRemove' | 'drawingModify' | 'drawingBatch' | 'drawingOrder';
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
