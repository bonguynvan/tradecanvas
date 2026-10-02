import { describe, it, expect, beforeEach } from 'vitest';
import type { DrawingOptionDefs } from '@tradecanvas/commons';
import { DrawingManager } from '../DrawingManager.js';
import { TrendLineTool } from '../tools/TrendLine.js';
import { UndoRedoManager } from '../../features/UndoRedoManager.js';
import { unitViewport } from './fixtures.js';

const OPTIONS: DrawingOptionDefs = {
  extendRight: { kind: 'boolean', label: 'Extend right', default: false },
  width: { kind: 'number', label: 'Width', default: 2, min: 1, max: 4 },
};

/** A trend line that offers two options. */
class OptionLine extends TrendLineTool {
  override descriptor = { ...new TrendLineTool().descriptor, options: OPTIONS };
}

let manager: DrawingManager;
let undo: UndoRedoManager;
let events: [string, unknown][];

beforeEach(() => {
  manager = new DrawingManager();
  manager.register(new OptionLine());
  undo = new UndoRedoManager();
  manager.setUndoRedoManager(undo);
  events = [];
  manager.setEventCallback((event, data) => events.push([event, data]));
});

const line = (options?: Record<string, unknown>) =>
  manager.addDrawing({ type: 'trendLine', anchors: [{ time: 0, price: 10 }, { time: 5, price: 20 }], options: options as never });

describe('DrawingManager drawing options', () => {
  it('keeps the valid options a drawing is added with', () => {
    const id = line({ extendRight: true, width: 9, bogus: 1 });
    expect(manager.getDrawings()[0].options).toEqual({ extendRight: true, width: 4 });
    expect(manager.getDrawingOptions(id)).toEqual({ extendRight: true, width: 4 });
  });

  it('fills defaults in when reading a drawing’s options', () => {
    const id = line();
    expect(manager.getDrawingOptions(id)).toEqual({ extendRight: false, width: 2 });
  });

  it('changes options as one undo step and announces it', () => {
    const id = line();
    expect(manager.setDrawingOptions(id, { extendRight: true })).toBe(true);
    expect(manager.getDrawingOptions(id).extendRight).toBe(true);
    expect(events.at(-1)).toEqual(['drawingUpdate', { id }]);
    manager.undo();
    expect(manager.getDrawingOptions(id).extendRight).toBe(false);
  });

  it('ignores options for an unknown drawing', () => {
    expect(manager.setDrawingOptions('nope', { extendRight: true })).toBe(false);
  });

  it('starts new drawings from the tool’s defaults, explicit options winning', () => {
    manager.setToolDefaults('trendLine', { width: 3, extendRight: true });
    const fromDefaults = line();
    const explicit = line({ extendRight: false });
    expect(manager.getDrawingOptions(fromDefaults)).toEqual({ extendRight: true, width: 3 });
    expect(manager.getDrawingOptions(explicit)).toEqual({ extendRight: false, width: 3 });
    expect(manager.getToolDefaults('trendLine')).toEqual({ width: 3, extendRight: true });
  });

  it('gives drawings made with the pointer the tool’s defaults', () => {
    manager.setToolDefaults('trendLine', { extendRight: true });
    manager.setActiveTool('trendLine');
    manager.onPointerDown({ x: 105, y: 50 }, unitViewport);
    manager.onPointerDown({ x: 205, y: 30 }, unitViewport);
    expect(manager.getDrawings()[0].options).toEqual({ extendRight: true });
  });

  it('drops invalid options from loaded drawings', () => {
    manager.setDrawings([{
      id: 'a', type: 'trendLine', anchors: [{ time: 0, price: 1 }, { time: 1, price: 2 }],
      style: { color: '#fff', lineWidth: 1, lineStyle: 'solid' }, visible: true, locked: false,
      options: { extendRight: 'yes', width: 3 } as never,
    }]);
    expect(manager.getDrawings()[0].options).toEqual({ width: 3 });
  });

  it('turns an edit session into one undo step', () => {
    const id = line();
    const before = structuredClone(manager.getDrawings()[0]);
    manager.beginEdit(id);
    manager.updateDrawing(id, { options: { width: 3 } });
    manager.updateDrawing(id, { style: { color: '#f00' }, anchors: [{ time: 1, price: 11 }, { time: 6, price: 21 }] });
    expect(undo.getState().undoCount).toBe(1); // only the create so far
    manager.endEdit(id);
    expect(undo.getState().undoCount).toBe(2);
    manager.undo();
    const restored = manager.getDrawings()[0];
    expect(restored.options).toBeUndefined();
    expect(restored.style.color).toBe(before.style.color);
    expect(restored.anchors).toEqual(before.anchors);
  });

  it('puts the drawing back when an edit is cancelled', () => {
    const id = line();
    manager.beginEdit(id);
    manager.updateDrawing(id, { options: { extendRight: true }, style: { color: '#0f0' } });
    manager.endEdit(id, { cancel: true });
    expect(manager.getDrawings()[0].options).toBeUndefined();
    expect(manager.getDrawings()[0].style.color).not.toBe('#0f0');
    expect(undo.getState().undoCount).toBe(1);
  });

  it('adds no undo step for an edit that changed nothing', () => {
    const id = line();
    manager.beginEdit(id);
    manager.endEdit(id);
    expect(undo.getState().undoCount).toBe(1);
  });

  it('keeps the anchor count of the tool when anchors are edited', () => {
    const id = line();
    expect(manager.updateDrawing(id, { anchors: [{ time: 1, price: 1 }] })).toBe(false);
    expect(manager.updateDrawing(id, { anchors: [{ time: 1, price: Number.NaN }, { time: 2, price: 2 }] })).toBe(false);
    expect(manager.getDrawings()[0].anchors[0]).toEqual({ time: 0, price: 10 });
  });

  it('copies options with the drawing', () => {
    const id = line({ extendRight: true });
    const copy = manager.duplicateDrawing(id)!;
    manager.setDrawingOptions(copy, { extendRight: false });
    expect(manager.getDrawingOptions(id).extendRight).toBe(true);
  });

  it('finds the topmost visible drawing under a point', () => {
    const below = line();
    const above = line();
    // y 90 → 80 from x 5 to 55 in the unit viewport.
    expect(manager.drawingAt({ x: 30, y: 85 }, unitViewport)).toBe(above);
    manager.updateDrawing(above, { options: {} });
    manager.setDrawingVisible(above, false);
    expect(manager.drawingAt({ x: 30, y: 85 }, unitViewport)).toBe(below);
    expect(manager.drawingAt({ x: 900, y: 10 }, unitViewport)).toBeNull();
  });
});

