import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DrawingManager } from '../DrawingManager.js';
import { TrendLineTool } from '../tools/TrendLine.js';
import { UndoRedoManager } from '../../features/UndoRedoManager.js';
import { drawing, unitViewport } from './fixtures.js';

let manager: DrawingManager;
let events: { event: string; data: unknown }[];

beforeEach(() => {
  manager = new DrawingManager();
  manager.register(new TrendLineTool());
  manager.setUndoRedoManager(new UndoRedoManager());
  events = [];
  manager.setEventCallback((event, data) => events.push({ event, data }));
});

describe('strong magnet', () => {
  // One bar a slot (unitViewport: bar i at x = i*10 + 5; 1 px a point): every price of it
  // is over 30 px from a click at 50, the nearest being the close, 12.
  const bars = Array.from({ length: 10 }, (_, i) => ({ time: i, open: 10, high: 95, low: 5, close: 12, volume: 1 }));
  const vp = { ...unitViewport, data: undefined };

  const anchorAt = (mode: 'magnet' | 'strong', price: number) => {
    manager.setDataGetter(() => bars);
    manager.setMagnetMode(mode);
    manager.setActiveTool('trendLine');
    manager.onPointerDown({ x: 25, y: 100 - price }, vp);
    manager.onPointerDown({ x: 55, y: 100 - price }, vp);
    return manager.getDrawings()[0].anchors[0].price;
  };

  it('the weak magnet leaves a point far from every price where it is', () => {
    expect(anchorAt('magnet', 50)).toBe(50);
  });

  it('the strong magnet snaps it to the nearest price anyway', () => {
    expect(anchorAt('strong', 50)).toBe(12);
  });
});

describe('eraser', () => {
  const line = (id: string, price: number, locked = false) =>
    drawing('trendLine', [{ time: 0, price }, { time: 10, price }], { id, locked });

  it('removes the drawing clicked, one undo step each, and stays on', () => {
    manager.setDrawings([line('a', 50), line('b', 20)]);
    manager.setEraser(true);
    expect(manager.onPointerDown({ x: 55, y: 50 }, unitViewport)).toBe(true);
    expect(manager.getDrawings().map((d) => d.id)).toEqual(['b']);
    expect(manager.isEraser()).toBe(true);
    manager.undo();
    expect(manager.getDrawings().map((d) => d.id).sort()).toEqual(['a', 'b']);
  });

  it('leaves locked drawings, and a press off any drawing, to the chart', () => {
    manager.setDrawings([line('a', 50, true)]);
    manager.setEraser(true);
    expect(manager.onPointerDown({ x: 55, y: 50 }, unitViewport)).toBe(false);
    expect(manager.onPointerDown({ x: 55, y: 90 }, unitViewport)).toBe(false);
    expect(manager.getDrawings()).toHaveLength(1);
  });

  it('goes away with Escape or a tool picked, and says so', () => {
    manager.setEraser(true);
    expect(events.at(-1)).toEqual({ event: 'toolModeChange', data: { eraser: true } });
    manager.onKeyDown('Escape');
    expect(manager.isEraser()).toBe(false);
    manager.setEraser(true);
    manager.setActiveTool('trendLine');
    expect(manager.isEraser()).toBe(false);
    expect(events.filter((e) => e.event === 'toolModeChange').map((e) => e.data)).toEqual([
      { eraser: true }, { eraser: false }, { eraser: true }, { eraser: false },
    ]);
  });

  it('drops the tool being drawn with when it comes on', () => {
    const toolChange = vi.fn();
    manager.setEventCallback((event, data) => { if (event === 'drawingToolChange') toolChange(data); });
    manager.setActiveTool('trendLine');
    manager.setEraser(true);
    expect(manager.getActiveTool()).toBeNull();
    expect(toolChange).toHaveBeenLastCalledWith({ tool: null });
  });

  it('shows a pointer over what it would remove', () => {
    manager.setDrawings([line('a', 50)]);
    manager.setEraser(true);
    expect(manager.hoverCursorAt({ x: 55, y: 50 }, unitViewport)).toBe('pointer');
    expect(manager.hoverCursorAt({ x: 55, y: 90 }, unitViewport)).toBeNull();
  });
});
