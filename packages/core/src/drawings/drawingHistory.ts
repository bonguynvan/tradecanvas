import type { DrawingState } from '@tradecanvas/commons';
import type { UndoableAction } from '../features/UndoRedoManager.js';
import type { DrawingOrderMove } from './drawingState.js';

/** The drawings in `ids` order; any not listed stay after them. */
export function orderDrawings(drawings: readonly DrawingState[], ids: readonly string[]): DrawingState[] {
  const byId = new Map(drawings.map((d) => [d.id, d]));
  const listed = new Set(ids);
  const ordered = ids.map((id) => byId.get(id)).filter((d): d is DrawingState => d !== undefined);
  return [...ordered, ...drawings.filter((d) => !listed.has(d.id))];
}

/** Where a drawing at `from` (of `count`) goes for `to`. */
export function orderTarget(from: number, count: number, to: DrawingOrderMove): number {
  const last = count - 1;
  switch (to) {
    case 'front': return last;
    case 'back': return 0;
    case 'forward': return Math.min(last, from + 1);
    case 'backward': return Math.max(0, from - 1);
  }
}

function replace(drawings: readonly DrawingState[], state: DrawingState): DrawingState[] {
  return drawings.map((d) => (d.id === state.id ? structuredClone(state) : d));
}

/** The drawings with `action` taken back. Changed drawings are new objects. */
export function undoAction(drawings: readonly DrawingState[], action: UndoableAction): DrawingState[] {
  switch (action.type) {
    case 'drawingBatch':
      return [...(action.actions ?? [])].reverse().reduce(undoAction, [...drawings]);
    case 'drawingCreate':
      return action.after ? drawings.filter((d) => d.id !== action.after!.id) : [...drawings];
    case 'drawingRemove': {
      // Back where it was.
      if (!action.before) return [...drawings];
      const next = [...drawings];
      next.splice(Math.min(action.index ?? next.length, next.length), 0, structuredClone(action.before));
      return next;
    }
    case 'drawingOrder':
      return action.order ? orderDrawings(drawings, action.order.before) : [...drawings];
    case 'drawingModify':
      return action.before ? replace(drawings, action.before) : [...drawings];
    default:
      return [...drawings];
  }
}

/** The drawings with `action` done again. */
export function redoAction(drawings: readonly DrawingState[], action: UndoableAction): DrawingState[] {
  switch (action.type) {
    case 'drawingBatch':
      return (action.actions ?? []).reduce(redoAction, [...drawings]);
    case 'drawingCreate':
      return action.after ? [...drawings, structuredClone(action.after)] : [...drawings];
    case 'drawingRemove':
      return action.before ? drawings.filter((d) => d.id !== action.before!.id) : [...drawings];
    case 'drawingOrder':
      return action.order ? orderDrawings(drawings, action.order.after) : [...drawings];
    case 'drawingModify':
      return action.after ? replace(drawings, action.after) : [...drawings];
    default:
      return [...drawings];
  }
}
