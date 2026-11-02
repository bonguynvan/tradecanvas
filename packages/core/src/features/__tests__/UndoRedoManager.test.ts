import { describe, it, expect } from 'vitest';
import { UndoRedoManager, type UndoableAction } from '../UndoRedoManager.js';

const step = (subject: string): UndoableAction => ({ type: 'custom', before: null, after: null, custom: { undo: () => {}, redo: () => {}, subject, at: 0 } });

describe('UndoRedoManager.group', () => {
  it('records every step pushed inside it as one batch', () => {
    const history = new UndoRedoManager();
    history.push(step('before'));
    history.group(() => {
      history.push(step('a'));
      history.push(step('b'));
    });
    expect(history.getState().undoCount).toBe(2);
    const batch = history.undo()!;
    expect(batch.type).toBe('drawingBatch');
    expect(batch.actions?.map((a) => a.custom?.subject)).toEqual(['a', 'b']);
  });

  it('keeps a single step as it is, and adds nothing for none', () => {
    const history = new UndoRedoManager();
    history.group(() => {});
    expect(history.getState().canUndo).toBe(false);
    history.group(() => history.push(step('only')));
    expect(history.last()?.custom?.subject).toBe('only');
  });

  it('joins a group inside a group to the outer one, and returns what its function returns', () => {
    const history = new UndoRedoManager();
    const result = history.group(() => {
      history.push(step('a'));
      history.group(() => history.push(step('b')));
      return 7;
    });
    expect(result).toBe(7);
    expect(history.getState().undoCount).toBe(1);
    expect(history.last()?.actions?.length).toBe(2);
  });

  it('clears what was left to redo, as any new step does', () => {
    const history = new UndoRedoManager();
    history.push(step('a'));
    history.undo();
    history.group(() => history.push(step('b')));
    expect(history.getState().canRedo).toBe(false);
  });

  it('within a group, last, replaceLast and dropLast act on the group', () => {
    const history = new UndoRedoManager();
    history.push(step('outside'));
    history.group(() => {
      expect(history.last()).toBeNull();
      history.push(step('a'));
      expect(history.last()?.custom?.subject).toBe('a');
      history.replaceLast(step('a2'));
      history.push(step('b'));
      history.dropLast();
    });
    expect(history.last()?.custom?.subject).toBe('a2');
    expect(history.getState().undoCount).toBe(2);
  });

  it('never reaches past an empty group to replace the step before it', () => {
    const history = new UndoRedoManager();
    history.push(step('outside'));
    history.group(() => history.replaceLast(step('inside')));
    expect(history.getState().undoCount).toBe(2);
    expect(history.undo()?.custom?.subject).toBe('inside');
    expect(history.last()?.custom?.subject).toBe('outside');
  });

  it('keeps what ran before a throw as one step, and is no longer grouping after it', () => {
    const history = new UndoRedoManager();
    expect(() => history.group(() => {
      history.push(step('a'));
      history.push(step('b'));
      throw new Error('halfway');
    })).toThrow('halfway');
    expect(history.last()?.actions?.length).toBe(2);
    history.push(step('after'));
    expect(history.getState().undoCount).toBe(2);
  });
});
