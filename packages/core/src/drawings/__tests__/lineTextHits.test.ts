import { describe, it, expect } from 'vitest';
import type { DrawingPlugin, DrawingState, DrawingStyle } from '@tradecanvas/commons';
import { drawing, recordingCtx, unitViewport } from './fixtures.js';
import { TrendLineTool } from '../tools/TrendLine.js';
import { HorizontalLineTool } from '../tools/HorizontalLine.js';
import { VerticalLineTool } from '../tools/VerticalLine.js';
import { RectangleTool } from '../tools/Rectangle.js';
import { RayTool } from '../tools/Ray.js';
import { TextHitCache } from '../tools/lineText.js';
import { DrawingManager } from '../DrawingManager.js';
import { registerBuiltInDrawingTools } from '../tools/index.js';
import { UndoRedoManager } from '../../features/UndoRedoManager.js';

/** `unitViewport`: bar i at x = i·10 + 5, price p at y = 100 − p; the plot is 1000 × 100. */
const x = (bar: number) => bar * 10 + 5;
const y = (price: number) => 100 - price;
const TOLERANCE = 8;

const base: DrawingStyle = { color: '#4c8dff', lineWidth: 1, lineStyle: 'solid' };
/** Drawn once, as the chart does, so the tool knows where its words went. */
function drawn(tool: DrawingPlugin, state: DrawingState): DrawingPlugin {
  tool.render(recordingCtx().ctx, state, unitViewport, false);
  return tool;
}

describe('a click on the words on a line picks the line', () => {
  const flat = (text?: string) => drawing('trendLine', [{ time: 10, price: 50 }, { time: 30, price: 50 }], { style: { ...base, text } });
  // The words sit above the line's middle: 12 px over it is on them, and past the line's reach.
  const onWords = { x: (x(10) + x(30)) / 2, y: y(50) - 12 };

  it('on a trend line', () => {
    expect(drawn(new TrendLineTool(), flat()).hitTest(onWords, flat(), unitViewport, TOLERANCE)).toBe(false);
    const state = flat('Breakout');
    expect(drawn(new TrendLineTool(), state).hitTest(onWords, state, unitViewport, TOLERANCE)).toBe(true);
  });

  it('on a line that slopes, along its slope', () => {
    const state = drawing('trendLine', [{ time: 10, price: 20 }, { time: 30, price: 80 }], { style: { ...base, text: 'Up' } });
    const tool = drawn(new TrendLineTool(), state);
    // The words' middle: above the line's middle, square to it.
    const angle = Math.atan2(y(80) - y(20), x(30) - x(10));
    const mid = { x: (x(10) + x(30)) / 2, y: (y(20) + y(80)) / 2 };
    const up = 12;
    const point = { x: mid.x + up * Math.sin(angle), y: mid.y - up * Math.cos(angle) };
    expect(tool.hitTest(point, state, unitViewport, 2)).toBe(true);
    // As far off, but under the line where no words are.
    const below = { x: mid.x - up * Math.sin(angle), y: mid.y + up * Math.cos(angle) };
    expect(tool.hitTest(below, state, unitViewport, 2)).toBe(false);
  });

  it('on a horizontal and a vertical line', () => {
    const level = drawing('horizontalLine', [{ time: 10, price: 40 }], { style: { ...base, text: 'Support', textAlign: 'center' } });
    expect(drawn(new HorizontalLineTool(), level).hitTest({ x: 500, y: y(40) - 12 }, level, unitViewport, TOLERANCE)).toBe(true);
    const upright = drawing('verticalLine', [{ time: 50, price: 40 }], { style: { ...base, text: 'CPI' } });
    // Read bottom to top: the words sit left of the line.
    expect(drawn(new VerticalLineTool(), upright).hitTest({ x: x(50) - 12, y: 50 }, upright, unitViewport, TOLERANCE)).toBe(true);
  });

  it('inside a box with no fill, where a click used to fall through', () => {
    const box = (text?: string) => drawing('rectangle', [{ time: 10, price: 90 }, { time: 40, price: 10 }], { style: { ...base, text } });
    const inside = { x: (x(10) + x(40)) / 2, y: y(90) + 12 };
    expect(drawn(new RectangleTool(), box()).hitTest(inside, box(), unitViewport, TOLERANCE)).toBe(false);
    expect(drawn(new RectangleTool(), box('Range')).hitTest(inside, box('Range'), unitViewport, TOLERANCE)).toBe(true);
  });
});

describe('Escape while a drawing is dragged', () => {
  const setUp = () => {
    const manager = new DrawingManager();
    registerBuiltInDrawingTools(manager);
    const history = new UndoRedoManager();
    manager.setUndoRedoManager(history);
    manager.setDrawings([drawing('trendLine', [{ time: 10, price: 30 }, { time: 30, price: 70 }], { id: 'a' })]);
    return { manager, history, anchors: () => manager.getDrawings()[0].anchors };
  };

  it('puts a moved drawing back, with nothing to undo', () => {
    const { manager, history, anchors } = setUp();
    manager.onPointerDown({ x: x(20), y: y(50) }, unitViewport);
    manager.onPointerMove({ x: x(25), y: y(40) }, unitViewport);
    expect(manager.onKeyDown('Escape')).toBe(true);
    manager.onPointerMove({ x: x(28), y: y(35) }, unitViewport);
    manager.onPointerUp();
    expect(anchors()).toEqual([{ time: 10, price: 30 }, { time: 30, price: 70 }]);
    expect(history.getState().canUndo).toBe(false);
    expect(manager.getSelectedDrawingIds()).toEqual(['a']);
  });

  it('puts a reshaped drawing back', () => {
    const { manager, anchors } = setUp();
    manager.select('a');
    manager.onPointerDown({ x: x(30), y: y(70) }, unitViewport);
    manager.onPointerMove({ x: x(40), y: y(60) }, unitViewport);
    manager.onKeyDown('Escape');
    manager.onPointerUp();
    expect(anchors()).toEqual([{ time: 10, price: 30 }, { time: 30, price: 70 }]);
  });

  it('drops a copy being dragged out', () => {
    const { manager, history } = setUp();
    manager.beginCopyDrag({ x: x(20), y: y(50) }, unitViewport);
    manager.onPointerMove({ x: x(20), y: y(50) - 30 }, unitViewport);
    expect(manager.getDrawings()).toHaveLength(2);
    manager.onKeyDown('Escape');
    manager.onPointerUp();
    expect(manager.getDrawings().map((d) => d.id)).toEqual(['a']);
    expect(history.getState().canUndo).toBe(false);
  });
});

describe('the box round a line\'s words', () => {
  it('is told by each line tool, so the toolbar over a selection keeps clear of the words', () => {
    const level = drawing('horizontalLine', [{ time: 10, price: 40 }], { id: 'h', style: { ...base, text: 'Support', textAlign: 'center' } });
    const tool = drawn(new HorizontalLineTool(), level);
    const box = tool.textBox!(level, unitViewport)!;
    expect(box.y + box.height).toBeLessThanOrEqual(y(40));
    expect(box.x).toBeLessThan(500);
    expect(box.x + box.width).toBeGreaterThan(500);
    const plain = drawing('horizontalLine', [{ time: 10, price: 40 }], { id: 'p' });
    expect(drawn(new HorizontalLineTool(), plain).textBox!(plain, unitViewport)).toBeNull();
  });

  it('bounds the words of a sloping line, turned with it', () => {
    const state = drawing('trendLine', [{ time: 10, price: 20 }, { time: 30, price: 80 }], { id: 's', style: { ...base, text: 'Up' } });
    const box = drawn(new TrendLineTool(), state).textBox!(state, unitViewport)!;
    const mid = { x: (x(10) + x(30)) / 2, y: (y(20) + y(80)) / 2 };
    // Above the line's middle, up and to the left of it on a rising line.
    expect(box.y).toBeLessThan(mid.y);
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
  });
});

describe('the words\' boxes kept right', () => {
  it('forget a line\'s words once it is drawn with none to show (its points on top of each other)', () => {
    const tool = new RayTool();
    const shown = drawing('ray', [{ time: 10, price: 50 }, { time: 30, price: 50 }], { id: 'r', style: { ...base, text: 'Gone soon', textAlign: 'center' } });
    tool.render(recordingCtx().ctx, shown, unitViewport, false);
    const words = tool.textBox!(shown, unitViewport)!;
    const at = { x: words.x + words.width / 2, y: words.y + words.height / 2 };
    const collapsed = { ...shown, anchors: [{ time: 10, price: 50 }, { time: 10, price: 50 }] };
    tool.render(recordingCtx().ctx, collapsed, unitViewport, false);
    expect(tool.hitTest(at, collapsed, unitViewport, 2)).toBe(false);
    expect(tool.textBox!(collapsed, unitViewport)).toBeNull();
  });

  it('keep every drawing\'s words in a chart of thousands', () => {
    const cache = new TextHitCache();
    const box = { x: 0, y: 0, angle: 0, left: 0, top: 0, width: 10, height: 10 };
    for (let i = 0; i < 3000; i++) cache.set(`d${i}`, box);
    expect(cache.hit('d0', { x: 5, y: 5 }, 0)).toBe(true);
    expect(cache.hit('d2999', { x: 5, y: 5 }, 0)).toBe(true);
  });
});

describe('Escape on a copy being dragged out', () => {
  it('gives the selection back to the drawings it was copied from', () => {
    const manager = new DrawingManager();
    registerBuiltInDrawingTools(manager);
    manager.setUndoRedoManager(new UndoRedoManager());
    manager.setDrawings([drawing('trendLine', [{ time: 10, price: 30 }, { time: 30, price: 70 }], { id: 'a' })]);
    manager.select('a');
    manager.beginCopyDrag({ x: x(20), y: y(50) }, unitViewport);
    manager.onPointerMove({ x: x(20), y: y(50) - 30 }, unitViewport);
    manager.onKeyDown('Escape');
    manager.onPointerUp();
    expect(manager.getSelectedDrawingIds()).toEqual(['a']);
  });
});
