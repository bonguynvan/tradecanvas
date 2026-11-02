import { describe, it, expect, beforeEach } from 'vitest';
import type { DrawingPlugin, DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingManager, type DrawingPanes } from '../DrawingManager.js';
import { TrendLineTool } from '../tools/TrendLine.js';
import { HorizontalLineTool } from '../tools/HorizontalLine.js';
import { drawing, textCtx, unitViewport } from './fixtures.js';
import { UndoRedoManager } from '../../features/UndoRedoManager.js';

/**
 * The price pane is `unitViewport` (y 0–100, prices 0–100). Under it, pane
 * 'rsi' spans y 120–220 with values 0–100, so a value v sits at y 220 − v.
 */
const rsiViewport: ViewportState = { ...unitViewport, chartRect: { x: 0, y: 120, width: 1000, height: 100 } };

let manager: DrawingManager;
let shownPanes: Set<string>;
let values: number[];
let existing: Set<string>;

const panes: DrawingPanes = {
  paneAt: (pos: Point) => (pos.y < 100 ? undefined : pos.y >= 120 && pos.y < 220 ? 'rsi' : null),
  viewportOf: (id) => (id === 'rsi' && shownPanes.has(id) ? rsiViewport : null),
  hasPane: (id) => existing.has(id),
  valuesAt: () => values,
};

/** A plugin that only records the viewport it is drawn with. */
function recorder(seen: [string, number][]): DrawingPlugin {
  return {
    descriptor: { type: 'spy', name: 'Spy', requiredAnchors: 1 },
    render: (_ctx, state, viewport) => { seen.push([state.id, viewport.chartRect.y]); },
    hitTest: () => false,
    hitTestAnchor: () => -1,
  };
}

const ids = () => manager.getDrawings().map((d) => d.id);
const byId = (id: string) => manager.getDrawings().find((d) => d.id === id)!;

beforeEach(() => {
  shownPanes = new Set(['rsi']);
  existing = new Set(['rsi']);
  values = [];
  manager = new DrawingManager();
  manager.register(new TrendLineTool());
  manager.register(new HorizontalLineTool());
  manager.setPanes(panes);
});

describe('drawing on an indicator pane', () => {
  it('makes a drawing begun in a pane on that pane, read on its scale', () => {
    manager.setActiveTool('trendLine');
    manager.onPointerDown({ x: 55, y: 150 }, unitViewport);
    manager.onPointerDown({ x: 105, y: 170 }, unitViewport);
    const [made] = manager.getDrawings();
    expect(made.paneId).toBe('rsi');
    expect(made.anchors).toEqual([{ time: 5, price: 70 }, { time: 10, price: 50 }]);
  });

  it('makes one begun on the price pane without a pane, as before', () => {
    manager.setActiveTool('trendLine');
    manager.onPointerDown({ x: 55, y: 30 }, unitViewport);
    manager.onPointerDown({ x: 105, y: 50 }, unitViewport);
    const [made] = manager.getDrawings();
    expect(made.paneId).toBeUndefined();
    expect(made.anchors).toEqual([{ time: 5, price: 70 }, { time: 10, price: 50 }]);
  });

  it('keeps reading a drawing on its pane’s scale when a later point is past the pane', () => {
    manager.setActiveTool('trendLine');
    manager.onPointerDown({ x: 55, y: 150 }, unitViewport);
    manager.onPointerDown({ x: 105, y: 250 }, unitViewport);
    const [, second] = manager.getDrawings()[0].anchors;
    expect(second.time).toBe(10);
    expect(second.price).toBeCloseTo(-30);
  });

  it('starts nothing where no pane takes drawings (an axis, a side or folded pane)', () => {
    manager.setActiveTool('trendLine');
    expect(manager.onPointerDown({ x: 55, y: 110 }, unitViewport)).toBe(false);
    shownPanes.clear();
    expect(manager.onPointerDown({ x: 55, y: 150 }, unitViewport)).toBe(false);
    expect(manager.getDrawings()).toEqual([]);
  });

  it('starts no tool that reads the bars’ prices on a pane', () => {
    const priceOnly = Object.assign(Object.create(new HorizontalLineTool()), {
      descriptor: { type: 'pricey', name: 'Price only', requiredAnchors: 1, singleClick: true, priceOnly: true },
    }) as DrawingPlugin;
    manager.register(priceOnly);
    manager.setActiveTool('pricey');
    expect(manager.onPointerDown({ x: 55, y: 150 }, unitViewport)).toBe(false);
    manager.onPointerDown({ x: 55, y: 30 }, unitViewport);
    expect(manager.getDrawings().map((d) => d.paneId)).toEqual([undefined]);
  });

  it('finds a press’s drawing among those of the pane it lands in', () => {
    manager.setDrawings([
      drawing('horizontalLine', [{ time: 5, price: 70 }], { id: 'onPrice' }),
      drawing('horizontalLine', [{ time: 5, price: 70 }], { id: 'onRsi', paneId: 'rsi' }),
    ]);
    expect(manager.drawingAt({ x: 300, y: 150 }, unitViewport)).toBe('onRsi');
    expect(manager.drawingAt({ x: 300, y: 30 }, unitViewport)).toBe('onPrice');
    // The price pane's line at 70 would be at y 30 of the price pane, not here.
    expect(manager.drawingAt({ x: 300, y: 110 }, unitViewport)).toBeNull();
    manager.onPointerDown({ x: 300, y: 150 }, unitViewport);
    expect(manager.getSelectedDrawingIds()).toEqual(['onRsi']);
    expect(manager.hoverCursorAt({ x: 300, y: 150 }, unitViewport)).not.toBeNull();
  });

  it('drags a pane’s drawing on the pane’s scale, and leaves a selected one of the price pane where it is', () => {
    manager.setDrawings([
      drawing('horizontalLine', [{ time: 5, price: 70 }], { id: 'onRsi', paneId: 'rsi' }),
      drawing('horizontalLine', [{ time: 5, price: 40 }], { id: 'onPrice' }),
    ]);
    manager.toggleSelectionAt({ x: 300, y: 60 }, unitViewport);
    manager.toggleSelectionAt({ x: 300, y: 150 }, unitViewport);
    manager.onPointerDown({ x: 300, y: 150 }, unitViewport);
    manager.onPointerMove({ x: 300, y: 160 }, unitViewport);
    manager.onPointerUp();
    expect(byId('onRsi').anchors[0].price).toBe(60);
    expect(byId('onPrice').anchors[0].price).toBe(40);
  });

  it('selects with a box the drawings of the pane the box is drawn in', () => {
    manager.setDrawings([
      drawing('horizontalLine', [{ time: 5, price: 70 }], { id: 'onPrice' }),
      drawing('horizontalLine', [{ time: 5, price: 70 }], { id: 'onRsi', paneId: 'rsi' }),
    ]);
    expect(manager.selectInRect({ x0: 0, y0: 130, x1: 200, y1: 170 }, unitViewport, 'rsi')).toBe(1);
    expect(manager.getSelectedDrawingIds()).toEqual(['onRsi']);
    expect(manager.selectInRect({ x0: 0, y0: 10, x1: 200, y1: 50 }, unitViewport)).toBe(1);
    expect(manager.getSelectedDrawingIds()).toEqual(['onPrice']);
  });

  it('finds nothing off the price plot when the chart gives no panes (an axis right-click)', () => {
    manager.setPanes(null);
    manager.setDrawings([drawing('horizontalLine', [{ time: 5, price: 70 }], { id: 'a' })]);
    expect(manager.drawingAt({ x: 300, y: 30 }, unitViewport)).toBe('a');
    expect(manager.drawingAt({ x: 1010, y: 30 }, unitViewport)).toBeNull();
  });

  it('pastes no price-only tool onto a pane', () => {
    manager.setUndoRedoManager(new UndoRedoManager());
    const vwap = Object.assign(Object.create(new HorizontalLineTool()), {
      descriptor: { type: 'pricey', name: 'Price only', requiredAnchors: 1, priceOnly: true },
    }) as DrawingPlugin;
    manager.register(vwap);
    manager.setDrawings([drawing('pricey', [{ time: 5, price: 70 }], { id: 'a', paneId: 'rsi' })]);
    manager.select('a');
    manager.copySelection();
    expect(manager.paste()).toEqual([]);
  });

  it('erases on the pane the press lands in', () => {
    manager.setDrawings([drawing('horizontalLine', [{ time: 5, price: 70 }], { id: 'onRsi', paneId: 'rsi' })]);
    manager.setEraser(true);
    expect(manager.onPointerDown({ x: 300, y: 30 }, unitViewport)).toBe(false);
    expect(manager.onPointerDown({ x: 300, y: 150 }, unitViewport)).toBe(true);
    expect(ids()).toEqual([]);
  });

  it('draws each drawing with its pane’s viewport, and none on a pane not drawn', () => {
    const seen: [string, number][] = [];
    manager.register(recorder(seen));
    manager.setDrawings([
      drawing('spy', [{ time: 1, price: 1 }], { id: 'p' }),
      drawing('spy', [{ time: 1, price: 1 }], { id: 'r', paneId: 'rsi' }),
      drawing('spy', [{ time: 1, price: 1 }], { id: 'gone', paneId: 'macd' }),
    ]);
    manager.render(textCtx().ctx, unitViewport);
    expect(seen).toEqual([['p', 0], ['r', 120]]);
    expect(manager.isShown('r')).toBe(true);
    expect(manager.isShown('gone')).toBe(false);
    shownPanes.clear();
    seen.length = 0;
    manager.render(textCtx().ctx, unitViewport);
    expect(seen).toEqual([['p', 0]]);
    expect(manager.isShown('r')).toBe(false);
  });

  it('clips each drawing to its own pane, so it never crosses into another', () => {
    const clips: number[][] = [];
    let rect: number[] = [];
    const ctx = new Proxy({} as Record<string, unknown>, {
      get: (_t, key: string) => {
        if (key === 'rect') return (...args: number[]) => { rect = args; };
        if (key === 'clip') return () => { clips.push(rect); };
        return () => undefined;
      },
      set: () => true,
    }) as unknown as CanvasRenderingContext2D;
    manager.register(recorder([]));
    manager.setDrawings([
      drawing('spy', [{ time: 1, price: 1 }], { id: 'p' }),
      drawing('spy', [{ time: 1, price: 1 }], { id: 'r', paneId: 'rsi' }),
    ]);
    manager.render(ctx, unitViewport);
    expect(clips).toEqual([[0, 0, 1000, 100], [0, 120, 1000, 100]]);
  });

  it('snaps to the pane’s values with the magnet, not to the bars', () => {
    manager.setDataGetter(() => Array.from({ length: 20 }, (_, i) => ({ time: i, open: 1, high: 2, low: 0, close: 1, volume: 0 })));
    manager.setMagnetMode('strong');
    values = [42, 64];
    manager.setActiveTool('horizontalLine');
    manager.onPointerDown({ x: 55, y: 220 - 60 }, unitViewport);
    expect(manager.getDrawings()[0]).toMatchObject({ paneId: 'rsi', anchors: [{ time: 5, price: 64 }] });
  });

  it('moves a pane’s drawings to the pane that takes it over', () => {
    manager.setDrawings([
      drawing('horizontalLine', [{ time: 5, price: 70 }], { id: 'a', paneId: 'rsi' }),
      drawing('horizontalLine', [{ time: 5, price: 70 }], { id: 'b' }),
    ]);
    manager.renamePanes(new Map([['rsi', 'macd']]));
    expect(manager.getDrawings().map((d) => d.paneId)).toEqual(['macd', undefined]);
  });

  it('pastes a pane’s drawing onto that pane, and leaves it out where there is no such pane', () => {
    manager.setUndoRedoManager(new UndoRedoManager());
    manager.setDrawings([drawing('horizontalLine', [{ time: 5, price: 70 }], { id: 'a', paneId: 'rsi' })]);
    manager.select('a');
    manager.copySelection();
    const [pasted] = manager.paste();
    expect(byId(pasted).paneId).toBe('rsi');
    // Pasted where the pane is not (another chart, or the pane was removed).
    existing.clear();
    expect(manager.paste()).toEqual([]);
  });

  it('keeps the pane through setDrawings and addDrawing', () => {
    manager.setDrawings([{ ...drawing('horizontalLine', [{ time: 5, price: 70 }], { id: 'a' }), paneId: 'rsi' } as DrawingState]);
    const id = manager.addDrawing({ type: 'horizontalLine', anchors: [{ time: 1, price: 2 }], paneId: 'rsi' });
    expect(manager.getDrawings().map((d) => d.paneId)).toEqual(['rsi', 'rsi']);
    expect(byId(id).paneId).toBe('rsi');
  });
});
