import type { DrawingOrderMove } from './drawingState.js';

/** What a key does to drawings. */
export type DrawingShortcut =
  | 'copy' | 'paste' | 'duplicate'
  | 'group' | 'ungroup'
  | DrawingOrderMove
  | 'undo' | 'redo'
  | 'escape' | 'delete' | 'finish';

const ORDER_KEYS: Readonly<Record<string, readonly [DrawingOrderMove, DrawingOrderMove]>> = {
  // [without Shift, with Shift]; Shift+] types } on most layouts.
  ']': ['forward', 'front'],
  '}': ['front', 'front'],
  '[': ['backward', 'back'],
  '{': ['back', 'back'],
};

/**
 * The drawing shortcut for a key: Ctrl/⌘ with C, V, D, G (Shift: ungroup),
 * ] and [ (Shift: all the way), Z (Shift: redo) and Y; Escape; Delete and
 * Backspace; Enter (ends a path being drawn). Pass `shift` so Caps Lock
 * doesn't count as Shift; without it an upper-case letter does.
 */
export function drawingShortcut(key: string, ctrl: boolean, shift?: boolean): DrawingShortcut | null {
  if (key === 'Escape') return 'escape';
  if (key === 'Enter' && !ctrl) return 'finish';
  if (key === 'Delete' || key === 'Backspace') return 'delete';
  if (!ctrl) return null;
  const shifted = shift ?? (key.length === 1 && key !== key.toLowerCase());
  const order = ORDER_KEYS[key];
  if (order) return order[shifted ? 1 : 0];
  switch (key.toLowerCase()) {
    case 'c': return 'copy';
    case 'v': return 'paste';
    case 'd': return 'duplicate';
    case 'g': return shifted ? 'ungroup' : 'group';
    case 'z': return shifted ? 'redo' : 'undo';
    case 'y': return 'redo';
    default: return null;
  }
}
