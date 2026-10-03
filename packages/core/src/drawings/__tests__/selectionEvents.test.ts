import { describe, it, expect, vi } from 'vitest';
import { DrawingManager } from '../DrawingManager.js';
import { TrendLineTool } from '../tools/TrendLine.js';
import { UndoRedoManager } from '../../features/UndoRedoManager.js';

describe('DrawingManager selection listener', () => {
  it('tells its listener when the selection changes, and only then', () => {
    const manager = new DrawingManager();
    manager.register(new TrendLineTool());
    manager.setUndoRedoManager(new UndoRedoManager());
    const a = manager.addDrawing({ type: 'trendLine', anchors: [{ time: 0, price: 1 }, { time: 5, price: 1 }] });
    const b = manager.addDrawing({ type: 'trendLine', anchors: [{ time: 0, price: 2 }, { time: 5, price: 2 }] });
    const seen = vi.fn();
    manager.setSelectionListener(seen);

    manager.select(a);
    expect(seen).toHaveBeenLastCalledWith([a]);
    manager.select(a); // already selected
    expect(seen).toHaveBeenCalledTimes(1);
    manager.select(b);
    expect(seen).toHaveBeenLastCalledWith([b]);
    manager.removeDrawing(b);
    expect(seen).toHaveBeenLastCalledWith([]);
    expect(seen).toHaveBeenCalledTimes(3);
  });
});
