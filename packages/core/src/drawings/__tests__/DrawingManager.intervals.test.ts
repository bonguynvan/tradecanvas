import { describe, it, expect, beforeEach } from 'vitest';
import { DrawingManager } from '../DrawingManager.js';
import { TrendLineTool } from '../tools/TrendLine.js';
import { UndoRedoManager } from '../../features/UndoRedoManager.js';
import { drawing, recordingCtx, unitViewport } from './fixtures.js';

let manager: DrawingManager;
let undo: UndoRedoManager;

beforeEach(() => {
  manager = new DrawingManager();
  manager.register(new TrendLineTool());
  undo = new UndoRedoManager();
  manager.setUndoRedoManager(undo);
});

/** A line from bar 0 at 10 to bar 5 at 20: on screen from (5, 90) to (55, 80). */
const line = (intervals?: Record<string, unknown>) =>
  manager.addDrawing({ type: 'trendLine', anchors: [{ time: 0, price: 10 }, { time: 5, price: 20 }], intervals: intervals as never });
const ON_LINE = { x: 30, y: 85 };

const strokes = () => {
  const { ctx, calls } = recordingCtx();
  manager.render(ctx, unitViewport);
  return calls.filter((c) => c.name === 'stroke').length;
};

describe('DrawingManager: drawings shown on some intervals', () => {
  it('keeps the rules a drawing is added with, cleaned', () => {
    line({ hours: [4, 1], days: false, minutes: [1, 59], bogus: true });
    expect(manager.getDrawings()[0].intervals).toEqual({ hours: [1, 4], days: false });
  });

  it('shows a drawing on every interval until the chart’s is known', () => {
    line({ minutes: false });
    expect(strokes()).toBe(1);
    expect(manager.drawingAt(ON_LINE, unitViewport)).not.toBeNull();
  });

  it('draws it, and lets it be hit, only on the intervals it is kept to', () => {
    const id = line({ minutes: false });
    manager.setTimeframe('5m');
    expect(manager.isShown(id)).toBe(false);
    expect(strokes()).toBe(0);
    expect(manager.drawingAt(ON_LINE, unitViewport)).toBeNull();
    expect(manager.select(id)).toBe(false);

    manager.setTimeframe('1h');
    expect(manager.isShown(id)).toBe(true);
    expect(strokes()).toBe(1);
    expect(manager.drawingAt(ON_LINE, unitViewport)).toBe(id);
  });

  it('lets go of a selected drawing the new interval hides', () => {
    const id = line({ hours: [1, 1] });
    manager.setTimeframe('1h');
    manager.select(id);
    manager.setTimeframe('4h');
    expect(manager.getSelectedDrawingIds()).toEqual([]);
  });

  it('changes the rules as one undo step; null shows it on all again', () => {
    const id = line();
    manager.setTimeframe('1d');
    expect(manager.updateDrawing(id, { intervals: { days: false } })).toBe(true);
    expect(manager.isShown(id)).toBe(false);
    expect(manager.updateDrawing(id, { intervals: null })).toBe(true);
    expect(manager.getDrawings()[0].intervals).toBeUndefined();
    manager.undo();
    expect(manager.getDrawings()[0].intervals).toEqual({ days: false });
    manager.undo();
    expect(manager.isShown(id)).toBe(true);
  });

  it('puts the rules back when an edit is cancelled', () => {
    const id = line({ weeks: false });
    manager.beginEdit(id);
    manager.updateDrawing(id, { intervals: { months: false } });
    manager.endEdit(id, { cancel: true });
    expect(manager.getDrawings()[0].intervals).toEqual({ weeks: false });
  });

  it('cleans the rules of loaded drawings, dropping ones it can’t read', () => {
    manager.setDrawings([
      drawing('trendLine', [{ time: 0, price: 10 }, { time: 5, price: 20 }], { id: 'a', intervals: { seconds: [30, 10] } }),
      drawing('trendLine', [{ time: 0, price: 10 }, { time: 5, price: 20 }], { id: 'b', intervals: 'all' as never }),
    ]);
    expect(manager.getDrawings().map((d) => d.intervals)).toEqual([{ seconds: [10, 30] }, undefined]);
  });

  it('selects only the group’s drawings this interval shows', () => {
    const a = line();
    const b = line({ minutes: false });
    manager.groupDrawings([a, b]);
    manager.setTimeframe('5m');
    manager.select(a);
    expect(manager.getSelectedDrawingIds()).toEqual([a]);
  });

  it('lets go of a selected drawing that new drawings keep off this interval', () => {
    const id = line();
    manager.setTimeframe('5m');
    manager.select(id);
    const [state] = manager.getDrawings();
    manager.setDrawings([{ ...state, intervals: { minutes: false } }]);
    expect(manager.getSelectedDrawingIds()).toEqual([]);
  });

  it('keeps the selection through an edit until it is kept, and after a cancel', () => {
    const id = line();
    manager.setTimeframe('5m');
    manager.select(id);
    manager.beginEdit(id);
    manager.updateDrawing(id, { intervals: { minutes: false } });
    expect(manager.getSelectedDrawingIds()).toEqual([id]);
    manager.endEdit(id, { cancel: true });
    expect(manager.getSelectedDrawingIds()).toEqual([id]);
    manager.beginEdit(id);
    manager.updateDrawing(id, { intervals: { minutes: false } });
    manager.endEdit(id);
    expect(manager.getSelectedDrawingIds()).toEqual([]);
  });

  it('pastes a drawing with its intervals, selecting only the ones this interval shows', () => {
    line();
    line({ minutes: false });
    expect(manager.selectInRect({ x0: 0, y0: 70, x1: 60, y1: 95 }, unitViewport)).toBe(2);
    manager.copySelection();
    manager.setTimeframe('5m');
    const pasted = manager.paste();
    expect(pasted).toHaveLength(2);
    expect(manager.getDrawings().find((d) => d.id === pasted[1])!.intervals).toEqual({ minutes: false });
    expect(manager.getSelectedDrawingIds()).toEqual([pasted[0]]);
  });

  it('leaves a hidden group mate out of the selection', () => {
    const a = line();
    const b = line();
    manager.groupDrawings([a, b]);
    manager.setDrawingVisible(b, false);
    manager.select(a);
    expect(manager.getSelectedDrawingIds()).toEqual([a]);
  });

  it('keeps a hidden drawing hidden whatever the interval', () => {
    const id = line();
    manager.setDrawingVisible(id, false);
    manager.setTimeframe('1h');
    expect(manager.isShown(id)).toBe(false);
  });
});
