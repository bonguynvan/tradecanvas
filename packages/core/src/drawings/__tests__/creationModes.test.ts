import { describe, it, expect, beforeEach } from 'vitest';
import { DrawingManager } from '../DrawingManager.js';
import { BrushTool, PathTool, PolylineTool } from '../tools/freehand.js';
import { TrendLineTool } from '../tools/TrendLine.js';
import { AnchoredVWAPTool } from '../tools/AnchoredVWAP.js';
import { UndoRedoManager } from '../../features/UndoRedoManager.js';
import { unitViewport } from './fixtures.js';

let manager: DrawingManager;
const vp = unitViewport;

beforeEach(() => {
  manager = new DrawingManager();
  for (const tool of [new BrushTool(), new PathTool(), new PolylineTool(), new TrendLineTool()]) manager.register(tool);
  manager.setUndoRedoManager(new UndoRedoManager());
});

describe('freehand drawing', () => {
  it('follows a press and drag, a point every few pixels, and ends on release', () => {
    manager.setActiveTool('brush');
    manager.onPointerDown({ x: 10, y: 50 }, vp);
    for (let x = 11; x <= 60; x++) manager.onPointerMove({ x, y: 50 }, vp);
    expect(manager.onPointerUp()).toBe(true);
    const [stroke] = manager.getDrawings();
    expect(stroke.type).toBe('brush');
    expect(stroke.anchors.length).toBeGreaterThan(10);
    expect(stroke.anchors.length).toBeLessThan(40); // not every pixel
    expect(manager.getActiveTool()).toBeNull();
  });

  it('drops a click that never moved', () => {
    manager.setActiveTool('brush');
    manager.onPointerDown({ x: 10, y: 50 }, vp);
    manager.onPointerUp();
    expect(manager.getDrawings()).toHaveLength(0);
  });

  it('takes the stroke back with one undo', () => {
    manager.setActiveTool('brush');
    manager.onPointerDown({ x: 10, y: 50 }, vp);
    for (let x = 12; x <= 40; x += 2) manager.onPointerMove({ x, y: 40 }, vp);
    manager.onPointerUp();
    manager.undo();
    expect(manager.getDrawings()).toHaveLength(0);
  });
});

describe('path drawing', () => {
  const click = (x: number, y: number) => {
    manager.onPointerDown({ x, y }, vp);
    manager.onPointerUp();
  };

  it('takes a point per click until a click on the last point (a double-click)', () => {
    manager.setActiveTool('path');
    click(10, 50);
    click(50, 20);
    click(90, 60);
    expect(manager.getDrawings()).toHaveLength(0);
    click(90, 60); // the second click of a double-click
    const [path] = manager.getDrawings();
    expect(path.anchors).toHaveLength(3);
    expect(manager.justFinished()).toBe(true);
  });

  it('ends with Enter', () => {
    manager.setActiveTool('path');
    click(10, 50);
    click(50, 20);
    expect(manager.onKeyDown('Enter')).toBe(true);
    expect(manager.getDrawings()[0].anchors).toHaveLength(2);
  });

  it('needs as many points as the tool asks for before it ends', () => {
    manager.setActiveTool('polyline');
    click(10, 50);
    click(50, 20);
    expect(manager.onKeyDown('Enter')).toBe(false); // a shape takes three
    click(50, 20);
    expect(manager.getDrawings()).toHaveLength(0);
    click(90, 60);
    click(90, 60);
    expect(manager.getDrawings()[0].anchors).toHaveLength(3);
  });

  it('shows the next point under the pointer while drawing', () => {
    manager.setActiveTool('path');
    click(10, 50);
    expect(manager.onPointerMove({ x: 70, y: 30 }, vp)).toBe(true);
  });

  it('cancels with Escape', () => {
    manager.setActiveTool('path');
    click(10, 50);
    click(50, 20);
    manager.onKeyDown('Escape');
    expect(manager.getDrawings()).toHaveLength(0);
  });
});

describe('click drawing', () => {
  it('still takes the anchors a tool needs, one click each', () => {
    manager.setActiveTool('trendLine');
    manager.onPointerDown({ x: 10, y: 50 }, vp);
    expect(manager.getDrawings()).toHaveLength(0);
    manager.onPointerDown({ x: 60, y: 20 }, vp);
    expect(manager.getDrawings()[0].anchors).toHaveLength(2);
  });
});

describe('tools drawn from the bars', () => {
  it('get the chart’s bars, registered before or after the data', () => {
    const before = new AnchoredVWAPTool();
    manager.register(before);
    const bars = [{ time: 1, open: 1, high: 2, low: 0, close: 1, volume: 10 }];
    manager.setDataGetter(() => bars);
    const after = new AnchoredVWAPTool();
    manager.register(after);
    for (const tool of [before, after]) {
      expect((tool as unknown as { dataGetter: () => unknown }).dataGetter()).toBe(bars);
    }
  });
});

describe('drawing, the review cases', () => {
  const click = (x: number, y: number) => {
    manager.onPointerDown({ x, y }, vp);
    manager.onPointerUp();
  };

  it('Ctrl+Z while drawing takes back the last point, and leaves older history alone', () => {
    manager.addDrawing({ type: 'trendLine', anchors: [{ time: 0, price: 10 }, { time: 5, price: 10 }] });
    manager.setActiveTool('path');
    click(10, 50);
    click(50, 20);
    click(90, 60);
    expect(manager.onKeyDown('z', true)).toBe(true); // (90, 60) is taken back
    click(90, 60); // so this adds it again…
    click(90, 60); // …and this, on the last point, ends the path
    const path = manager.getDrawings().find((d) => d.type === 'path')!;
    expect(path.anchors).toHaveLength(3);
    expect(manager.getDrawings()).toHaveLength(2); // the trend line is still there
  });

  it('ends a path on its last point even after the chart moved under it', () => {
    manager.setActiveTool('path');
    click(10, 50);
    click(50, 20);
    const panned = { ...vp, offset: vp.offset + 30 }; // everything 30 px to the left
    manager.onPointerDown({ x: 20, y: 20 }, panned); // where the last point is now
    manager.onPointerUp();
    expect(manager.getDrawings()[0].anchors).toHaveLength(2);
  });

  it('thins a very long stroke instead of cutting its end', () => {
    manager.setActiveTool('brush');
    manager.onPointerDown({ x: 0, y: 50 }, vp);
    for (let x = 1; x <= 5000; x++) manager.onPointerMove({ x: x / 2, y: 50 + (x % 7) }, vp);
    manager.onPointerUp();
    const stroke = manager.getDrawings()[0];
    expect(stroke.anchors.length).toBeLessThanOrEqual(2000);
    expect(stroke.anchors.at(-1)!.time).toBeGreaterThan(240); // reaches the end of the drag (x 2500 = bar 249.5)
  });

  it('lets a drawing finished earlier be double-clicked straight away', () => {
    manager.setActiveTool('trendLine');
    click(10, 50);
    click(60, 20);
    expect(manager.justFinished()).toBe(true); // the click that finished it
    manager.setActiveTool('path');
    expect(manager.justFinished()).toBe(true);
  });
});
