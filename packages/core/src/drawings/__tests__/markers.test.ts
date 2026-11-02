import { describe, it, expect, beforeEach } from 'vitest';
import type { DrawingState, ViewportState } from '@tradecanvas/commons';
import { DrawingManager } from '../DrawingManager.js';
import { registerBuiltInDrawingTools } from '../tools/index.js';
import { SignpostTool, BalloonTool, AnchoredTextTool, AnchoredNoteTool } from '../tools/markers.js';
import { UndoRedoManager } from '../../features/UndoRedoManager.js';
import { screenPointToPixel } from '../screenAnchors.js';
import { drawing, recordingCtx, unitViewport } from './fixtures.js';

/** `unitViewport`: bar i at x = i·10 + 5, price p at y = 100 − p; the plot is 1000 × 100. */
const x = (bar: number) => bar * 10 + 5;
const y = (price: number) => 100 - price;
/** The same plot scrolled 20 bars and zoomed in price. */
const scrolled: ViewportState = { ...unitViewport, offset: 200, priceRange: { min: 40, max: 60 } };

const style = { color: '#4c8dff', lineWidth: 1, lineStyle: 'solid' as const };

describe('the new marker tools', () => {
  it('are built in: two on a bar, two on the screen, all with a text', () => {
    const manager = new DrawingManager();
    registerBuiltInDrawingTools(manager);
    for (const type of ['signpost', 'balloon', 'anchoredText', 'anchoredNote'] as const) {
      expect(manager.getDescriptor(type)?.text, type).toBe(true);
    }
    expect(new SignpostTool().descriptor.anchoring).toBeUndefined();
    expect(new AnchoredTextTool().descriptor.anchoring).toBe('screen');
    expect(new AnchoredNoteTool().descriptor.anchoring).toBe('screen');
  });

  it('draws a signpost’s text on a board above its bar, on a post down to it', () => {
    const rec = recordingCtx();
    new SignpostTool().render(rec.ctx, drawing('signpost', [{ time: 10, price: 30 }], { style: { ...style, text: 'Earnings' } }), unitViewport, false);
    expect(rec.texts).toEqual(['Earnings']);
    // The post: from the bar's point straight up.
    const post = rec.calls.findIndex((c) => c.name === 'moveTo' && c.args[0] === x(10) && c.args[1] === y(30));
    expect(post).toBeGreaterThanOrEqual(0);
    expect(rec.calls[post + 1]).toMatchObject({ name: 'lineTo', args: [x(10), expect.any(Number)] });
    expect(Number(rec.calls[post + 1].args[1])).toBeLessThan(y(30));
  });

  it('draws a balloon’s text in a bubble whose tail points at its bar', () => {
    const rec = recordingCtx();
    new BalloonTool().render(rec.ctx, drawing('balloon', [{ time: 10, price: 30 }], { style: { ...style, text: 'Look here' } }), unitViewport, false);
    expect(rec.texts).toEqual(['Look here']);
    expect(rec.calls.some((c) => c.name === 'lineTo' && c.args[0] === x(10) && c.args[1] === y(30))).toBe(true);
  });

  it('keeps a screen text where it was put on the plot, however the chart scrolls', () => {
    const tool = new AnchoredTextTool();
    const state = drawing('anchoredText', [{ time: 0.25, price: 0.5 }], { style: { ...style, text: 'Plan' } });
    const place = (vp: ViewportState) => {
      const rec = recordingCtx();
      tool.render(rec.ctx, state, vp, false);
      return rec.calls.find((c) => c.name === 'fillText')!.args.slice(1, 3);
    };
    expect(place(scrolled)).toEqual(place(unitViewport));
    expect(tool.hitTest({ x: 250 + 4, y: 50 + 4 }, state, scrolled, 4)).toBe(true);
  });
});

describe('a screen tool in the drawing manager', () => {
  let manager: DrawingManager;
  const screenText = () => manager.getDrawings().find((d) => d.type === 'anchoredText')!;

  beforeEach(() => {
    manager = new DrawingManager();
    registerBuiltInDrawingTools(manager);
    manager.setUndoRedoManager(new UndoRedoManager());
  });

  it('is placed at its share of the plot, with no magnet', () => {
    manager.setMagnetMode('strong');
    manager.setDataGetter(() => Array.from({ length: 100 }, (_, i) => ({ time: i, open: 1, high: 2, low: 0, close: 1, volume: 1 })));
    manager.setActiveTool('anchoredText');
    manager.onPointerDown({ x: 500, y: 50 }, unitViewport);
    expect(screenText().anchors[0]).toEqual({ time: 0.5, price: 0.5 });
  });

  it('moves across the plot by its share, and the arrow keys move it too', () => {
    manager.setDrawings([{ ...drawing('anchoredText', [{ time: 0.5, price: 0.5 }], { id: 's', style: { ...style, text: 'Plan' } }) }]);
    manager.onPointerDown({ x: 504, y: 54 }, scrolled);
    manager.onPointerMove({ x: 604, y: 74 }, scrolled);
    manager.onPointerUp();
    expect(screenText().anchors[0].time).toBeCloseTo(0.6);
    expect(screenText().anchors[0].price).toBeCloseTo(0.7);
    expect(manager.nudge(1, -1, scrolled)).toBe(true);
    expect(screenText().anchors[0].time).toBeCloseTo(0.61);
    expect(screenText().anchors[0].price).toBeCloseTo(0.69);
  });

  it('keeps its shares when a saved layout is loaded on timestamped bars', () => {
    manager.setDataGetter(() => Array.from({ length: 50 }, (_, i) => ({ time: 1_700_000_000_000 + i * 60_000, open: 1, high: 2, low: 0, close: 1, volume: 1 })));
    manager.setDrawings([drawing('anchoredText', [{ time: 0.3, price: 0.4 }], { id: 's' }) as DrawingState]);
    expect(screenText().anchors[0]).toEqual({ time: 0.3, price: 0.4 });
  });

  it('pastes a copy a little across the plot, not bars later', () => {
    manager.setDrawings([drawing('anchoredText', [{ time: 0.3, price: 0.4 }], { id: 's' })]);
    manager.select('s');
    manager.copySelection();
    const [copy] = manager.paste();
    const pasted = manager.getDrawings().find((d) => d.id === copy)!.anchors[0];
    expect(pasted.time).toBeGreaterThan(0.3);
    expect(pasted.time).toBeLessThan(0.4);
  });

  it('is caught by a selection box where it shows', () => {
    manager.setDrawings([drawing('anchoredText', [{ time: 0.3, price: 0.4 }], { id: 's' })]);
    expect(manager.selectInRect({ x0: 290, y0: 30, x1: 310, y1: 50 }, scrolled)).toBe(1);
  });
});

describe('screen points kept in sight', () => {
  let manager: DrawingManager;
  const first = () => manager.getDrawings()[0].anchors[0];

  beforeEach(() => {
    manager = new DrawingManager();
    registerBuiltInDrawingTools(manager);
    manager.setUndoRedoManager(new UndoRedoManager());
  });

  it('keeps shares between 0 and 1 however the drawing comes in', () => {
    manager.addDrawing({ type: 'anchoredText', anchors: [{ time: 1_700_000_000_000, price: -5 }] });
    expect(first()).toEqual({ time: 1, price: 0 });
    manager.updateDrawing(manager.getDrawings()[0].id, { anchors: [{ time: 0.4, price: 7 }] });
    expect(first()).toEqual({ time: 0.4, price: 1 });
    manager.setDrawings([drawing('anchoredNote', [{ time: -3, price: 0.5 }], { id: 'n' })]);
    expect(first()).toEqual({ time: 0, price: 0.5 });
  });

  it('draws a point at the plot’s far edges far enough in for its text to show', () => {
    const p = screenPointToPixel({ time: 1, price: 1 }, unitViewport);
    expect(p.x).toBeLessThanOrEqual(1000 - 24);
    expect(p.y).toBeLessThanOrEqual(100 - 24);
    expect(screenPointToPixel({ time: 0, price: 0 }, unitViewport).y).toBeGreaterThanOrEqual(24);
  });

  it('pastes a copy of one at the edge back into the plot, not on top of it', () => {
    manager.setDrawings([drawing('anchoredText', [{ time: 0.99, price: 0.99 }], { id: 's' })]);
    manager.select('s');
    manager.copySelection();
    const [copy] = manager.paste();
    const pasted = manager.getDrawings().find((d) => d.id === copy)!.anchors[0];
    expect(pasted.time).toBeLessThan(0.99);
    expect(pasted.price).toBeLessThan(0.99);
  });
});

describe('markers at the plot’s edge', () => {
  it('hangs a signpost’s board under its point near the top, so it is not cut off', () => {
    const rec = recordingCtx();
    new SignpostTool().render(rec.ctx, drawing('signpost', [{ time: 10, price: 95 }], { style: { ...style, text: 'High' } }), unitViewport, false);
    const text = rec.calls.find((c) => c.name === 'fillText')!;
    expect(Number(text.args[2])).toBeGreaterThan(y(95));
  });

  it('keeps a balloon inside the plot by its right edge', () => {
    const rec = recordingCtx();
    new BalloonTool().render(rec.ctx, drawing('balloon', [{ time: 99, price: 30 }], { style: { ...style, text: 'Right at the edge of the chart' } }), unitViewport, false);
    const text = rec.calls.find((c) => c.name === 'fillText')!;
    expect(Number(text.args[1]) + 'Right at the edge of the chart'.length * 6).toBeLessThanOrEqual(1000);
  });

  it('draws no border round a balloon’s tail when its border is off', () => {
    const rec = recordingCtx();
    new BalloonTool().render(rec.ctx, drawing('balloon', [{ time: 10, price: 30 }], { style: { ...style, text: 'Quiet', textBorder: false } }), unitViewport, false);
    expect(rec.calls.filter((c) => c.name === 'stroke')).toHaveLength(0);
  });
});

describe('markers scrolled off the plot', () => {
  it('leave with their bar instead of sliding along the edge', () => {
    const rec = recordingCtx();
    new SignpostTool().render(rec.ctx, drawing('signpost', [{ time: -10, price: 30 }], { style: { ...style, text: 'Gone' } }), unitViewport, false);
    const text = rec.calls.find((c) => c.name === 'fillText')!;
    // Its bar is 95 px left of the plot: the board stays over it, off the plot too.
    expect(Number(text.args[1])).toBeLessThan(0);
  });
});
