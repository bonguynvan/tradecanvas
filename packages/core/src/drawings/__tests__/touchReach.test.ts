import { describe, it, expect, beforeEach } from 'vitest';
import { DrawingManager } from '../DrawingManager.js';
import { BrushTool, PathTool } from '../tools/freehand.js';
import { TrendLineTool } from '../tools/TrendLine.js';
import { UndoRedoManager } from '../../features/UndoRedoManager.js';
import { TOUCH_REACH } from '../../interaction/pointerReach.js';
import { unitViewport, drawing } from './fixtures.js';

let manager: DrawingManager;
const vp = unitViewport;
const finger = TOUCH_REACH;

beforeEach(() => {
  manager = new DrawingManager();
  for (const tool of [new BrushTool(), new PathTool(), new TrendLineTool()]) manager.register(tool);
  manager.setUndoRedoManager(new UndoRedoManager());
});

/** A flat trend line at price 50 (y 50), from bar 10 to bar 40 (x 105 → 405). */
const flatLine = () => manager.setDrawings([drawing('trendLine', [{ time: 10, price: 50 }, { time: 40, price: 50 }], { id: 'l1' })]);

describe('a finger’s reach on drawings', () => {
  it('takes a line 14px off with a finger, not with the mouse', () => {
    flatLine();
    expect(manager.onPointerDown({ x: 200, y: 64 }, vp)).toBe(false);
    manager.onPointerUp();
    expect(manager.onPointerDown({ x: 200, y: 64 }, vp, finger)).toBe(true);
    expect(manager.getSelectedDrawingId()).toBe('l1');
  });

  it('grabs a handle of the selected drawing within a finger’s handle reach', () => {
    flatLine();
    manager.select('l1');
    // 18px from the first point, off the line's own reach.
    expect(manager.onPointerDown({ x: 105 - 18, y: 50 }, vp, finger)).toBe(true);
    manager.onPointerMove({ x: 60, y: 30 }, vp);
    manager.onPointerUp();
    const [line] = manager.getDrawings();
    expect(line.anchors[0].price).not.toBe(50);
    expect(line.anchors[1]).toEqual({ time: 40, price: 50 });
  });

  it('the eraser takes a drawing within a finger’s reach', () => {
    flatLine();
    manager.setEraser(true);
    expect(manager.onPointerDown({ x: 200, y: 64 }, vp, finger)).toBe(true);
    expect(manager.getDrawings()).toHaveLength(0);
  });
});

describe('placeAt: press, drag, lift', () => {
  it('draws a line: the press is its first point, the lift its second', () => {
    manager.setActiveTool('trendLine');
    manager.onPointerDown({ x: 105, y: 50 }, vp, finger);
    manager.onPointerMove({ x: 305, y: 20 }, vp);
    expect(manager.placeAt({ x: 305, y: 20 }, vp)).toBe(true);
    manager.onPointerUp();
    const [line] = manager.getDrawings();
    expect(line.anchors).toHaveLength(2);
    expect(line.anchors[1].time).toBe(30);
  });

  it('places nothing once a drawing has more than its first point, or none being made', () => {
    expect(manager.placeAt({ x: 10, y: 10 }, vp)).toBe(false);
    manager.setActiveTool('path');
    manager.onPointerDown({ x: 10, y: 50 }, vp);
    manager.onPointerDown({ x: 50, y: 50 }, vp);
    expect(manager.placeAt({ x: 90, y: 50 }, vp)).toBe(false);
  });

  it('leaves a freehand stroke to its release', () => {
    manager.setActiveTool('brush');
    manager.onPointerDown({ x: 10, y: 50 }, vp);
    expect(manager.placeAt({ x: 60, y: 50 }, vp)).toBe(false);
  });
});

describe('takeBackPoint: a press called off', () => {
  it('drops the drawing whose first point it placed, the tool still picked', () => {
    manager.setActiveTool('trendLine');
    manager.onPointerDown({ x: 105, y: 50 }, vp);
    expect(manager.takeBackPoint()).toBe(true);
    manager.onPointerDown({ x: 205, y: 50 }, vp);
    manager.onPointerDown({ x: 305, y: 50 }, vp);
    const [line] = manager.getDrawings();
    expect(line.anchors[0].time).toBe(20);
  });

  it('takes back only the last point of a path', () => {
    manager.setActiveTool('path');
    manager.onPointerDown({ x: 10, y: 50 }, vp);
    manager.onPointerDown({ x: 50, y: 50 }, vp);
    manager.onPointerDown({ x: 90, y: 50 }, vp);
    manager.takeBackPoint();
    manager.onPointerDown({ x: 50, y: 50 }, vp); // a click on the last point ends it
    expect(manager.getDrawings()[0].anchors).toHaveLength(2);
  });

  it('is false with nothing being made', () => {
    expect(manager.takeBackPoint()).toBe(false);
  });
});
