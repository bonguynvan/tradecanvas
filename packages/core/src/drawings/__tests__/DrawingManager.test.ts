import { describe, it, expect, beforeEach } from 'vitest';
import type { DrawingState } from '@tradecanvas/commons';
import { DrawingManager } from '../DrawingManager.js';
import { TrendLineTool } from '../tools/TrendLine.js';
import { drawing } from './fixtures.js';

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
