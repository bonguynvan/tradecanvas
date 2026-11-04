import { describe, it, expect } from 'vitest';
import { UndoRedoManager, type SnapshotIndicator } from '@tradecanvas/core';
import { IndicatorHistory } from '../IndicatorHistory.js';

/** Indicators as plain records the test changes; the history snapshots them. */
function setup(options: { enabled?: boolean } = {}) {
  let list: SnapshotIndicator[] = [];
  let clock = 0;
  const steps = new UndoRedoManager();
  const history = new IndicatorHistory({
    steps,
    snapshot: () => list.map((ind) => ({ ...ind, params: { ...ind.params } })),
    enabled: () => options.enabled ?? true,
    now: () => clock,
  });
  const set = (next: SnapshotIndicator[]) => {
    list = next;
  };
  const rsi = (period: number): SnapshotIndicator => ({ id: 'rsi', instanceId: 'r1', params: { period } });
  return { steps, history, set, rsi, tick: (ms: number) => (clock += ms) };
}

describe('IndicatorHistory: an indicator change as one undo step', () => {
  it('keeps the indicators before and after a change', () => {
    const { steps, history, set, rsi } = setup();
    history.record(undefined, () => set([rsi(14)]));
    const step = steps.last();
    expect(step?.type).toBe('indicators');
    expect(step?.indicators?.before).toEqual([]);
    expect(step?.indicators?.after).toEqual([rsi(14)]);
  });

  it('returns what the change returned', () => {
    const { history, set, rsi } = setup();
    expect(history.record(undefined, () => (set([rsi(14)]), 'r1'))).toBe('r1');
  });

  it('records nothing when nothing changed', () => {
    const { steps, history } = setup();
    history.record('r1', () => undefined);
    expect(steps.getState().canUndo).toBe(false);
  });

  it('records nothing with undo off', () => {
    const { steps, history, set, rsi } = setup({ enabled: false });
    history.record(undefined, () => set([rsi(14)]));
    expect(steps.getState().canUndo).toBe(false);
  });

  it('merges quick changes to one indicator into one step', () => {
    const { steps, history, set, rsi, tick } = setup();
    history.record(undefined, () => set([rsi(14)]));
    history.record('r1', () => set([rsi(15)]));
    tick(100);
    history.record('r1', () => set([rsi(16)]));
    // One step takes the typed period back to 14, the one before it the indicator away.
    expect(steps.last()?.indicators?.before).toEqual([rsi(14)]);
    expect(steps.last()?.indicators?.after).toEqual([rsi(16)]);
    steps.undo();
    expect(steps.last()?.indicators?.after).toEqual([rsi(14)]);
  });

  it('keeps a slow change to the same indicator as a step of its own', () => {
    const { steps, history, set, rsi, tick } = setup();
    history.record('r1', () => set([rsi(15)]));
    tick(5000);
    history.record('r1', () => set([rsi(16)]));
    expect(steps.last()?.indicators?.before).toEqual([rsi(15)]);
  });

  it('drops the step when a burst ends where it began', () => {
    const { steps, history, set, rsi } = setup();
    set([rsi(14)]);
    history.record('r1', () => set([{ ...rsi(14), visible: false }]));
    history.record('r1', () => set([rsi(14)]));
    expect(steps.getState().canUndo).toBe(false);
  });

  it('keeps nested changes inside the outer step', () => {
    const { steps, history, set, rsi } = setup();
    history.record(undefined, () => {
      history.record('r1', () => set([rsi(14)]));
      history.record('r1', () => set([rsi(20)]));
    });
    expect(steps.last()?.indicators?.before).toEqual([]);
    expect(steps.last()?.indicators?.after).toEqual([rsi(20)]);
    steps.undo();
    expect(steps.getState().canUndo).toBe(false);
  });

  it('records nothing for a quiet change', () => {
    const { steps, history, set, rsi } = setup();
    history.quietly(() => history.record(undefined, () => set([rsi(14)])));
    expect(steps.getState().canUndo).toBe(false);
  });

  it('keeps the panes renamed in the step, merged across a burst', () => {
    const { steps, history, set, rsi } = setup();
    history.record('r1', () => {
      set([rsi(14)]);
      history.renamed('a', 'b');
    });
    history.record('r1', () => {
      set([rsi(15)]);
      history.renamed('b', 'c');
    });
    expect(steps.last()?.indicators?.renames).toEqual([['a', 'b'], ['b', 'c']]);
  });

  it('leaves out renames when there were none', () => {
    const { steps, history, set, rsi } = setup();
    history.record(undefined, () => set([rsi(14)]));
    expect(steps.last()?.indicators).not.toHaveProperty('renames');
  });

  it('records again after a change that threw', () => {
    const { steps, history, set, rsi } = setup();
    expect(() => history.record(undefined, () => {
      history.renamed('a', 'b');
      throw new Error('no');
    })).toThrow('no');
    history.record(undefined, () => set([rsi(14)]));
    expect(steps.last()?.indicators?.after).toEqual([rsi(14)]);
    expect(steps.last()?.indicators).not.toHaveProperty('renames');
  });

  it('ignores a rename outside a recorded change', () => {
    const { history } = setup();
    expect(() => history.renamed('a', 'b')).not.toThrow();
  });
});

describe('IndicatorHistory: an edit (a settings dialog)', () => {
  it('records the changes from begin to end as one step', () => {
    const { steps, history, set, rsi } = setup();
    set([rsi(14)]);
    history.begin('r1');
    history.record('r1', () => set([rsi(15)]));
    history.record('r1', () => set([rsi(16)]));
    expect(steps.getState().canUndo).toBe(false);
    history.end();
    expect(steps.last()?.indicators?.before).toEqual([rsi(14)]);
    expect(steps.last()?.indicators?.after).toEqual([rsi(16)]);
    expect(steps.last()?.indicators?.subject).toBe('r1');
  });

  it('records nothing for an edit that ends where it began', () => {
    const { steps, history, set, rsi } = setup();
    set([rsi(14)]);
    history.begin('r1');
    history.record('r1', () => set([rsi(15)]));
    history.record('r1', () => set([rsi(14)]));
    history.end();
    expect(steps.getState().canUndo).toBe(false);
  });

  it('ends the open edit when another begins', () => {
    const { steps, history, set, rsi } = setup();
    set([rsi(14)]);
    history.begin('r1');
    history.record('r1', () => set([rsi(15)]));
    history.begin('r1');
    expect(steps.last()?.indicators?.after).toEqual([rsi(15)]);
    history.end();
    // The second edit changed nothing; recording works again after it.
    history.record(undefined, () => set([]));
    expect(steps.last()?.indicators?.after).toEqual([]);
  });

  it('does nothing with undo off, and end without begin is harmless', () => {
    const { steps, history, set, rsi } = setup({ enabled: false });
    history.end();
    history.begin('r1');
    history.record('r1', () => set([rsi(15)]));
    history.end();
    expect(steps.getState().canUndo).toBe(false);
  });
});
