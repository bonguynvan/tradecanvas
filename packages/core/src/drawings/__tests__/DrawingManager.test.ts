import { describe, it, expect, beforeEach } from 'vitest';
import type { DrawingState } from '@tradecanvas/commons';
import { DrawingManager } from '../DrawingManager.js';
import { TrendLineTool } from '../tools/TrendLine.js';
import { drawing, unitViewport } from './fixtures.js';
import { UndoRedoManager } from '../../features/UndoRedoManager.js';

let manager: DrawingManager;

beforeEach(() => {
  manager = new DrawingManager();
  manager.register(new TrendLineTool());
});

describe('DrawingManager basic CRUD', () => {
  it('starts with no drawings', () => {
    expect(manager.getDrawings()).toEqual([]);
    expect(manager.getActiveTool()).toBeNull();
    expect(manager.getSelectedDrawingId()).toBeNull();
  });

  it('setDrawings replaces the list and getDrawings reflects it', () => {
    const a = drawing('trendLine', [
      { time: 0, price: 50 },
      { time: 10, price: 80 },
    ], { id: 'a' });
    const b = drawing('trendLine', [
      { time: 5, price: 30 },
      { time: 15, price: 60 },
    ], { id: 'b' });

    manager.setDrawings([a, b]);
    expect(manager.getDrawings().map((d) => d.id)).toEqual(['a', 'b']);
  });

  it('removeDrawing strips the matching id and is a no-op for unknown ids', () => {
    const a = drawing('trendLine', [{ time: 0, price: 1 }, { time: 1, price: 2 }], { id: 'a' });
    const b = drawing('trendLine', [{ time: 0, price: 1 }, { time: 1, price: 2 }], { id: 'b' });
    manager.setDrawings([a, b]);

    manager.removeDrawing('a');
    expect(manager.getDrawings().map((d) => d.id)).toEqual(['b']);
    manager.removeDrawing('does-not-exist');
    expect(manager.getDrawings().map((d) => d.id)).toEqual(['b']);
  });

  it('clearDrawings empties the list and resets selection', () => {
    const a = drawing('trendLine', [{ time: 0, price: 1 }, { time: 1, price: 2 }], { id: 'a' });
    manager.setDrawings([a]);
    manager.clearDrawings();
    expect(manager.getDrawings()).toEqual([]);
    expect(manager.getSelectedDrawingId()).toBeNull();
  });

  it('duplicateDrawing creates a copy with a new id offset by 3 bars', () => {
    const original: DrawingState = drawing(
      'trendLine',
      [
        { time: 10, price: 50 },
        { time: 20, price: 80 },
      ],
      { id: 'orig', locked: true },
    );
    manager.setDrawings([original]);

    const newId = manager.duplicateDrawing('orig');
    expect(newId).not.toBeNull();
    expect(newId).not.toBe('orig');

    const copies = manager.getDrawings();
    expect(copies).toHaveLength(2);
    const copy = copies.find((d) => d.id === newId)!;
    expect(copy.anchors[0].time).toBe(13);
    expect(copy.anchors[1].time).toBe(23);
    expect(copy.anchors[0].price).toBe(50);
    expect(copy.locked).toBe(false);
    expect(manager.getSelectedDrawingId()).toBe(newId);
  });

  it('duplicateDrawing returns null for an unknown id', () => {
    expect(manager.duplicateDrawing('missing')).toBeNull();
    expect(manager.getDrawings()).toEqual([]);
  });
});

describe('DrawingManager active tool state', () => {
  it('setActiveTool flips creation mode on and off', () => {
    expect(manager.getActiveTool()).toBeNull();
    manager.setActiveTool('trendLine');
    expect(manager.getActiveTool()).toBe('trendLine');
    manager.setActiveTool(null);
    expect(manager.getActiveTool()).toBeNull();
  });

  it('setStyle merges into the active style without throwing', () => {
    expect(() =>
      manager.setStyle({ color: '#ff0000', lineWidth: 3, lineStyle: 'dashed' }),
    ).not.toThrow();
  });
});

describe('DrawingManager magnet mode', () => {
  it('round-trips magnet mode getter/setter', () => {
    expect(manager.getMagnetMode()).toBe('none');
    manager.setMagnetMode('magnet');
    expect(manager.getMagnetMode()).toBe('magnet');
    manager.setMagnetMode('none');
    expect(manager.getMagnetMode()).toBe('none');
  });
});

describe('DrawingManager legacy anchor migration', () => {
  // Synthetic 1m bars at 1700000000s, +60s each — these are real timestamps,
  // so `data[idx].time > 1e9` and the upgrade heuristic triggers.
  const bars1m = Array.from({ length: 100 }, (_, i) => ({
    time: 1_700_000_000 + i * 60,
    open: 100, high: 101, low: 99, close: 100, volume: 1,
  }));

  it('upgrades legacy bar-index anchors to real timestamps via dataGetter', () => {
    manager.setDataGetter(() => bars1m);
    // Pretend a drawing was persisted from an older build that stored bar
    // indices in `anchor.time` (small integer values).
    const legacy = drawing('trendLine', [
      { time: 10, price: 100 },
      { time: 20, price: 101 },
    ], { id: 'legacy' });
    manager.setDrawings([legacy]);

    const upgraded = manager.getDrawings()[0];
    expect(upgraded.anchors[0].time).toBe(bars1m[10].time);
    expect(upgraded.anchors[1].time).toBe(bars1m[20].time);
  });

  it('leaves real-timestamp anchors untouched (idempotent)', () => {
    manager.setDataGetter(() => bars1m);
    const t0 = bars1m[10].time;
    const t1 = bars1m[20].time;
    const modern = drawing('trendLine', [
      { time: t0, price: 100 },
      { time: t1, price: 101 },
    ], { id: 'modern' });
    manager.setDrawings([modern]);

    const after = manager.getDrawings()[0];
    expect(after.anchors[0].time).toBe(t0);
    expect(after.anchors[1].time).toBe(t1);
  });
});

describe('DrawingManager — pressing a drawing grabs it', () => {
  // unitViewport: bar i → x = i*10 + 5, price p → y = 100 - p.
  const line = () => drawing('trendLine', [{ time: 0, price: 50 }, { time: 20, price: 50 }], { id: 'L' });

  it('moves an unselected drawing in the same drag that selects it', () => {
    manager.setDrawings([line()]);
    expect(manager.onPointerDown({ x: 105, y: 50 }, unitViewport)).toBe(true);
    expect(manager.getSelectedDrawingId()).toBe('L');
    manager.onPointerMove({ x: 105, y: 40 }, unitViewport); // 10 px up = +10 price
    manager.onPointerUp();
    expect(manager.getDrawings()[0].anchors.map((a) => a.price)).toEqual([60, 60]);
  });

  it('lets a press on a locked drawing pan the chart instead', () => {
    manager.setDrawings([{ ...line(), locked: true }]);
    expect(manager.onPointerDown({ x: 105, y: 50 }, unitViewport)).toBe(false);
    expect(manager.getSelectedDrawingId()).toBe('L');
  });

  it('records no undo step for a click that only selected', () => {
    const undo = new UndoRedoManager();
    manager.setUndoRedoManager(undo);
    manager.setDrawings([line()]);
    manager.onPointerDown({ x: 105, y: 50 }, unitViewport);
    manager.onPointerUp();
    expect(undo.canUndo()).toBe(false);
  });
});

describe('DrawingManager — magnet in the empty future', () => {
  it('keeps an anchor placed past the last bar where it was clicked', () => {
    const MIN = 60_000;
    const bars = Array.from({ length: 10 }, (_, i) => ({ time: i * MIN, open: 50, high: 60, low: 40, close: 55, volume: 1 }));
    manager.setDataGetter(() => bars);
    manager.setMagnetMode('magnet');
    manager.setActiveTool('trendLine');
    const vp = { ...unitViewport, data: bars };
    // Slot 15 (x = 155) is five bars past the newest one (index 9).
    manager.onPointerDown({ x: 155, y: 50 }, vp);
    manager.onPointerDown({ x: 195, y: 30 }, vp);
    const [a, b] = manager.getDrawings()[0].anchors;
    expect(a.time).toBe(15 * MIN);
    expect(b.time).toBe(19 * MIN);
  });
});

describe('DrawingManager — multi-selection', () => {
  // unitViewport: bar i → x = i*10 + 5, price p → y = 100 - p.
  const a = () => drawing('trendLine', [{ time: 0, price: 50 }, { time: 10, price: 50 }], { id: 'a' });
  const b = () => drawing('trendLine', [{ time: 20, price: 30 }, { time: 30, price: 30 }], { id: 'b' });
  const c = () => drawing('trendLine', [{ time: 60, price: 80 }, { time: 70, price: 80 }], { id: 'c' });

  it('selects every drawing with an anchor inside the box', () => {
    manager.setDrawings([a(), b(), c()]);
    const n = manager.selectInRect({ x0: 0, y0: 40, x1: 260, y1: 80 }, unitViewport);
    expect(n).toBe(2);
    expect(manager.getSelectedDrawingIds().sort()).toEqual(['a', 'b']);
  });

  it('moves the whole selection together, as one undo step', () => {
    const undo = new UndoRedoManager();
    manager.setUndoRedoManager(undo);
    manager.setDrawings([a(), b(), c()]);
    manager.selectInRect({ x0: 0, y0: 40, x1: 260, y1: 80 }, unitViewport);
    manager.onPointerDown({ x: 55, y: 50 }, unitViewport); // on drawing a
    manager.onPointerMove({ x: 55, y: 40 }, unitViewport); // up 10 px = +10 price
    manager.onPointerUp();
    const prices = Object.fromEntries(manager.getDrawings().map((d) => [d.id, d.anchors[0].price]));
    expect(prices).toEqual({ a: 60, b: 40, c: 80 });
    expect(undo.getState().undoCount).toBe(1);
    manager.undo();
    expect(manager.getDrawings().map((d) => d.anchors[0].price)).toEqual([50, 30, 80]);
  });

  it('deletes the whole selection with one key press and one undo step', () => {
    const undo = new UndoRedoManager();
    manager.setUndoRedoManager(undo);
    manager.setDrawings([a(), b(), c()]);
    manager.selectInRect({ x0: 0, y0: 40, x1: 260, y1: 80 }, unitViewport);
    expect(manager.onKeyDown('Delete')).toBe(true);
    expect(manager.getDrawings().map((d) => d.id)).toEqual(['c']);
    manager.undo();
    expect(manager.getDrawings().map((d) => d.id).sort()).toEqual(['a', 'b', 'c']);
  });

  it('Ctrl/⌘-click adds a drawing to the selection and takes it out again', () => {
    manager.setDrawings([a(), b()]);
    manager.toggleSelectionAt({ x: 55, y: 50 }, unitViewport);
    manager.toggleSelectionAt({ x: 255, y: 70 }, unitViewport);
    expect(manager.getSelectedDrawingIds().sort()).toEqual(['a', 'b']);
    manager.toggleSelectionAt({ x: 55, y: 50 }, unitViewport);
    expect(manager.getSelectedDrawingIds()).toEqual(['b']);
  });

  it('a plain press on an unselected drawing replaces the selection', () => {
    manager.setDrawings([a(), b(), c()]);
    manager.selectInRect({ x0: 0, y0: 40, x1: 260, y1: 80 }, unitViewport);
    manager.onPointerDown({ x: 655, y: 20 }, unitViewport); // drawing c
    manager.onPointerUp();
    expect(manager.getSelectedDrawingIds()).toEqual(['c']);
  });
});

describe('DrawingManager — stay in drawing mode', () => {
  it('keeps the tool after each drawing when on', () => {
    const events: [string, unknown][] = [];
    manager.setEventCallback((event, data) => events.push([event, data]));
    manager.setStayInDrawingMode(true);
    manager.setActiveTool('trendLine');
    manager.onPointerDown({ x: 5, y: 50 }, unitViewport);
    manager.onPointerDown({ x: 55, y: 50 }, unitViewport);
    manager.onPointerDown({ x: 105, y: 20 }, unitViewport);
    manager.onPointerDown({ x: 155, y: 20 }, unitViewport);
    expect(manager.getDrawings()).toHaveLength(2);
    expect(manager.getActiveTool()).toBe('trendLine');
    expect(manager.getSelectedDrawingIds()).toEqual([]);
    expect(events.filter(([e]) => e === 'drawingToolChange')).toEqual([['drawingToolChange', { tool: 'trendLine' }]]);

    manager.onKeyDown('Escape');
    expect(manager.getActiveTool()).toBeNull();
    expect(events.at(-1)).toEqual(['drawingToolChange', { tool: null }]);
  });

  it('drops the tool after one drawing when off, and says so', () => {
    const events: [string, unknown][] = [];
    manager.setEventCallback((event, data) => events.push([event, data]));
    manager.setActiveTool('trendLine');
    manager.onPointerDown({ x: 5, y: 50 }, unitViewport);
    manager.onPointerDown({ x: 55, y: 50 }, unitViewport);
    expect(manager.getActiveTool()).toBeNull();
    expect(manager.getSelectedDrawingIds()).toHaveLength(1);
    expect(events.at(-1)).toEqual(['drawingToolChange', { tool: null }]);
  });
});

describe('DrawingManager — copy and paste', () => {
  const line = (id: string, t: number) =>
    drawing('trendLine', [{ time: t, price: 50 }, { time: t + 10, price: 60 }], { id, locked: true });

  it('pastes copies of the selection, staggered, selected, as one undo step', () => {
    const undo = new UndoRedoManager();
    manager.setUndoRedoManager(undo);
    manager.setDrawings([line('a', 0), line('b', 20), line('c', 60)]);
    manager.selectInRect({ x0: 0, y0: 0, x1: 260, y1: 100 }, unitViewport); // a and b
    expect(manager.onKeyDown('c', true)).toBe(true);

    expect(manager.onKeyDown('v', true)).toBe(true);
    const pasted = manager.getSelectedDrawingIds();
    expect(pasted).toHaveLength(2);
    const copies = manager.getDrawings().filter((d) => pasted.includes(d.id));
    expect(copies.map((d) => d.anchors[0].time).sort((x, y) => x - y)).toEqual([3, 23]);
    expect(copies.every((d) => !d.locked)).toBe(true);

    manager.paste();
    const second = manager.getDrawings().slice(-2).map((d) => d.anchors[0].time).sort((x, y) => x - y);
    expect(second).toEqual([6, 26]);

    manager.undo(); // takes back the whole second paste
    expect(manager.getDrawings()).toHaveLength(5);
  });

  it('pastes into another chart at the same place', () => {
    manager.setDrawings([line('a', 0)]);
    manager.selectInRect({ x0: 0, y0: 0, x1: 50, y1: 100 }, unitViewport);
    manager.copySelection();

    const other = new DrawingManager();
    other.register(new TrendLineTool());
    expect(other.paste()).toHaveLength(1);
    expect(other.getDrawings()[0].anchors).toEqual([{ time: 0, price: 50 }, { time: 10, price: 60 }]);
  });

  it('leaves Ctrl+C to the browser when nothing is selected', () => {
    manager.setDrawings([line('a', 0)]);
    expect(manager.onKeyDown('c', true)).toBe(false);
  });

  it('does not paste while a drawing is being made', () => {
    manager.setDrawings([line('a', 0)]);
    manager.selectInRect({ x0: 0, y0: 0, x1: 50, y1: 100 }, unitViewport);
    manager.copySelection();
    manager.setActiveTool('trendLine');
    expect(manager.paste()).toEqual([]);
  });
});

describe('DrawingManager — after undo', () => {
  it('stays ready to draw in stay-in-drawing mode', () => {
    manager.setUndoRedoManager(new UndoRedoManager());
    manager.setStayInDrawingMode(true);
    manager.setActiveTool('trendLine');
    manager.onPointerDown({ x: 5, y: 50 }, unitViewport);
    manager.onPointerDown({ x: 55, y: 50 }, unitViewport);
    manager.undo();
    expect(manager.getDrawings()).toHaveLength(0);
    expect(manager.getActiveTool()).toBe('trendLine');
    // The next clicks draw again instead of selecting.
    manager.onPointerDown({ x: 5, y: 40 }, unitViewport);
    manager.onPointerDown({ x: 55, y: 40 }, unitViewport);
    expect(manager.getDrawings()).toHaveLength(1);
  });

  it('pastes only tools the chart allows', () => {
    manager.setDrawings([drawing('trendLine', [{ time: 0, price: 50 }, { time: 10, price: 60 }], { id: 'a' })]);
    manager.selectInRect({ x0: 0, y0: 0, x1: 120, y1: 100 }, unitViewport);
    manager.copySelection();
    manager.setToolFilter((type) => type !== 'trendLine');
    expect(manager.paste()).toEqual([]);
    expect(manager.getSelectedDrawingIds()).toEqual(['a']);
  });
});
