import { describe, it, expect, beforeEach } from 'vitest';
import { DrawingManager } from '../DrawingManager.js';
import { TextAnnotationTool } from '../tools/TextAnnotation.js';
import { HorizontalLineTool } from '../tools/HorizontalLine.js';
import { unitViewport } from './fixtures.js';
import { UndoRedoManager } from '../../features/UndoRedoManager.js';

let manager: DrawingManager;
let history: UndoRedoManager;
let created: { id: string; drawn?: boolean }[];

beforeEach(() => {
  manager = new DrawingManager();
  manager.register(new TextAnnotationTool());
  manager.register(new HorizontalLineTool());
  history = new UndoRedoManager();
  manager.setUndoRedoManager(history);
  created = [];
  manager.setEventCallback((event, payload) => {
    if (event === 'drawingCreate') created.push(payload as { id: string; drawn?: boolean });
  });
});

const drawText = () => {
  manager.setActiveTool('text');
  manager.onPointerDown({ x: 55, y: 50 }, unitViewport);
  return manager.getDrawings().at(-1)!.id;
};

describe('a drawing made with the pointer', () => {
  it('says so when it is made, and not when it is added, pasted or brought back by undo', () => {
    const id = drawText();
    manager.addDrawing({ type: 'horizontalLine', anchors: [{ time: 1, price: 2 }] });
    manager.removeDrawing(id);
    manager.undo();
    expect(created.map((c) => c.drawn === true)).toEqual([true, false, false]);
  });

  it('can be taken back with its step, leaving nothing to undo or redo', () => {
    const id = drawText();
    manager.takeBack(id);
    expect(manager.getDrawings()).toEqual([]);
    expect(history.getState()).toMatchObject({ canUndo: false, canRedo: false });
  });

  it('is removed as a step of its own when its making is no longer the last step', () => {
    const id = drawText();
    manager.addDrawing({ type: 'horizontalLine', anchors: [{ time: 1, price: 2 }] });
    manager.takeBack(id);
    expect(manager.getDrawings().map((d) => d.type)).toEqual(['horizontalLine']);
    manager.undo();
    expect(manager.getDrawings().map((d) => d.id)).toContain(id);
  });

  it('is taken back without an undo history too', () => {
    manager.setUndoRedoManager(null as unknown as UndoRedoManager);
    const id = drawText();
    manager.takeBack(id);
    expect(manager.getDrawings()).toEqual([]);
  });
});

describe('the words of a drawing just made', () => {
  it('go into the step that made it, so one undo takes the text and its words away', () => {
    const id = drawText();
    expect(manager.amendNew(id, { style: { text: 'Bre' } })).toBe(true);
    manager.amendNew(id, { style: { text: 'Breakout' } });
    expect(manager.getDrawings()[0].style.text).toBe('Breakout');
    manager.undo();
    expect(manager.getDrawings()).toEqual([]);
    expect(history.getState().canUndo).toBe(false);
    manager.redo();
    expect(manager.getDrawings()[0].style.text).toBe('Breakout');
  });

  it('are a step of their own once something else came after the drawing', () => {
    const id = drawText();
    manager.addDrawing({ type: 'horizontalLine', anchors: [{ time: 1, price: 2 }] });
    expect(manager.amendNew(id, { style: { text: 'Late' } })).toBe(true);
    manager.undo();
    expect(manager.getDrawings().find((d) => d.id === id)!.style.text).not.toBe('Late');
    expect(manager.getDrawings()).toHaveLength(2);
  });

  it('change nothing for a drawing that is gone', () => {
    expect(manager.amendNew('nope', { style: { text: 'x' } })).toBe(false);
  });
});
