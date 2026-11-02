import { describe, it, expect, beforeEach } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { DrawingManager } from '../DrawingManager.js';
import { TrendLineTool } from '../tools/TrendLine.js';
import { HorizontalLineTool } from '../tools/HorizontalLine.js';
import { drawing, unitViewport } from './fixtures.js';
import { UndoRedoManager } from '../../features/UndoRedoManager.js';
import { snapToBar } from '../magnetSnap.js';

/**
 * `unitViewport`: bar i is at x = i·10 + 5, price p at y = 100 − p. Every bar
 * opens at 40, reaches 60 and 20, and closes at 50.
 */
const bars: OHLCBar[] = Array.from({ length: 60 }, (_, i) => ({ time: i, open: 40, high: 60, low: 20, close: 50, volume: 1 }));
const x = (bar: number) => bar * 10 + 5;
const y = (price: number) => 100 - price;

let manager: DrawingManager;
let history: UndoRedoManager;

beforeEach(() => {
  manager = new DrawingManager();
  manager.register(new TrendLineTool());
  manager.register(new HorizontalLineTool());
  manager.setDataGetter(() => bars);
  history = new UndoRedoManager();
  manager.setUndoRedoManager(history);
});

const line = () => manager.getDrawings()[0];

describe('the magnet while editing', () => {
  it('puts a dragged handle on a bar’s price', () => {
    manager.setDrawings([drawing('trendLine', [{ time: 5, price: 30 }, { time: 20, price: 70 }], { id: 'a' })]);
    manager.setMagnetMode('strong');
    manager.select('a');
    manager.onPointerDown({ x: x(20), y: y(70) }, unitViewport);
    manager.onPointerMove({ x: x(30) + 2, y: y(58) }, unitViewport);
    manager.onPointerUp();
    expect(line().anchors[1]).toEqual({ time: 30, price: 60 });
  });

  it('puts a moved drawing’s nearest point on a bar’s price, the rest keeping their place to it', () => {
    manager.setDrawings([drawing('trendLine', [{ time: 5, price: 30 }, { time: 20, price: 70 }], { id: 'a' })]);
    manager.setMagnetMode('strong');
    // Press near the first point and drag 2 px down: it snaps to the low, 20.
    manager.onPointerDown({ x: x(6), y: y(32.7) }, unitViewport);
    manager.onPointerMove({ x: x(6), y: y(32.7) + 8 }, unitViewport);
    manager.onPointerUp();
    expect(line().anchors[0].price).toBe(20);
    expect(line().anchors[1].price).toBeCloseTo(60);
  });

  it('reaches 50 px with the weak magnet', () => {
    expect(snapToBar(3, 50 + 45, 'magnet', bars, unitViewport).price).toBe(60);
    expect(snapToBar(3, 60 + 55, 'magnet', bars, unitViewport).price).toBe(115);
  });

  it('turns over while Ctrl or ⌘ is held: on when off, off when on', () => {
    manager.setActiveTool('horizontalLine');
    manager.setModifiers({ ctrl: true, shift: false });
    manager.onPointerDown({ x: x(4), y: y(58) }, unitViewport);
    expect(line().anchors[0].price).toBe(60);
    manager.setMagnetMode('strong');
    manager.setActiveTool('horizontalLine');
    manager.onPointerDown({ x: x(4), y: y(58) }, unitViewport);
    expect(manager.getDrawings()[1].anchors[0].price).toBeCloseTo(58);
  });
});

describe('Shift while drawing and reshaping', () => {
  it('keeps a new line flat, upright or at 45°', () => {
    manager.setModifiers({ ctrl: false, shift: true });
    manager.setActiveTool('trendLine');
    manager.onPointerDown({ x: x(5), y: y(30) }, unitViewport);
    manager.onPointerDown({ x: x(15), y: y(34) }, unitViewport);
    expect(line().anchors[1].price).toBe(line().anchors[0].price);
    manager.setActiveTool('trendLine');
    manager.onPointerDown({ x: x(5), y: y(30) }, unitViewport);
    manager.onPointerDown({ x: x(6), y: y(68) }, unitViewport);
    expect(manager.getDrawings()[1].anchors[1].time).toBe(5);
    manager.setActiveTool('trendLine');
    manager.onPointerDown({ x: x(5), y: y(30) }, unitViewport);
    manager.onPointerDown({ x: x(9), y: y(72) }, unitViewport);
    const diagonal = manager.getDrawings()[2].anchors;
    // 45° on screen: as many px up as across.
    expect((diagonal[1].time - diagonal[0].time) * 10).toBeCloseTo(diagonal[1].price - diagonal[0].price);
  });

  it('keeps a reshaped line flat against its other point', () => {
    manager.setDrawings([drawing('trendLine', [{ time: 5, price: 30 }, { time: 20, price: 70 }], { id: 'a' })]);
    manager.select('a');
    manager.setModifiers({ ctrl: false, shift: true });
    manager.onPointerDown({ x: x(20), y: y(70) }, unitViewport);
    manager.onPointerMove({ x: x(25), y: y(33) }, unitViewport);
    manager.onPointerUp();
    expect(line().anchors[1].price).toBe(30);
  });
});

describe('arrow keys on a selection', () => {
  beforeEach(() => {
    manager.setDrawings([
      drawing('horizontalLine', [{ time: 5, price: 30 }], { id: 'a' }),
      drawing('horizontalLine', [{ time: 5, price: 40 }], { id: 'locked', locked: true }),
    ]);
    manager.select('a');
  });

  it('moves it a bar across or a pixel up and down', () => {
    expect(manager.nudge(1, 0, unitViewport)).toBe(true);
    expect(manager.nudge(0, -1, unitViewport)).toBe(true);
    expect(line().anchors[0].time).toBe(6);
    expect(line().anchors[0].price).toBeCloseTo(31);
  });

  it('keeps a run of presses as one undo step', () => {
    manager.nudge(1, 0, unitViewport);
    manager.nudge(1, 0, unitViewport);
    manager.nudge(1, 0, unitViewport);
    manager.undo();
    expect(line().anchors[0].time).toBe(5);
    expect(history.getState().canUndo).toBe(false);
  });

  it('leaves a locked drawing, and says so when nothing moved', () => {
    manager.select('locked');
    expect(manager.nudge(1, 0, unitViewport)).toBe(false);
    expect(manager.getDrawings()[1].anchors[0].time).toBe(5);
  });
});

describe('Ctrl- or ⌘-drag to copy', () => {
  beforeEach(() => {
    manager.setDrawings([drawing('horizontalLine', [{ time: 5, price: 30 }], { id: 'a' })]);
  });

  it('copies the drawing under the pointer and moves the copy, as one undo step', () => {
    expect(manager.beginCopyDrag({ x: x(5), y: y(30) }, unitViewport)).toBe(true);
    manager.onPointerMove({ x: x(5), y: y(30) - 20 }, unitViewport);
    manager.onPointerUp();
    const [original, copy] = manager.getDrawings();
    expect(original.anchors[0].price).toBe(30);
    expect(copy.anchors[0].price).toBe(50);
    expect(manager.getSelectedDrawingIds()).toEqual([copy.id]);
    manager.undo();
    expect(manager.getDrawings().map((d) => d.id)).toEqual(['a']);
  });

  it('only adds it to the selection, or takes it out, when the pointer does not travel', () => {
    expect(manager.beginCopyDrag({ x: x(5), y: y(30) }, unitViewport)).toBe(true);
    manager.onPointerUp();
    expect(manager.getDrawings()).toHaveLength(1);
    expect(manager.getSelectedDrawingIds()).toEqual(['a']);
  });

  it('takes nothing on empty chart, so a selection box can start there', () => {
    expect(manager.beginCopyDrag({ x: x(30), y: y(80) }, unitViewport)).toBe(false);
  });
});
