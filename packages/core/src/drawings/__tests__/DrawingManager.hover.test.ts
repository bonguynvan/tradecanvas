import { describe, it, expect } from 'vitest';
import type { DrawingState, ViewportState } from '@tradecanvas/commons';
import { DrawingManager } from '../DrawingManager.js';
import { HorizontalLineTool } from '../tools/HorizontalLine.js';
import { drawing, textCtx, unitViewport } from './fixtures.js';

/** A horizontal line that notes the glow each pass draws it with. */
class SeenLine extends HorizontalLineTool {
  glows: number[] = [];
  override render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    this.glows.push(Number(ctx.shadowBlur) || 0);
    super.render(ctx, state, viewport, selected);
  }
}

function scene() {
  const tool = new SeenLine();
  const manager = new DrawingManager();
  manager.register(tool);
  manager.setDrawings([drawing('horizontalLine', [{ time: 0, price: 50 }], { id: 'line' })]);
  return { tool, manager };
}

describe('a drawing under the pointer', () => {
  it('glows a little on the pointer’s layer, so it is plain which one a click takes, and stops when the pointer leaves', () => {
    const { tool, manager } = scene();
    // The line is at y 50 across the plot.
    expect(manager.hoverCursorAt({ x: 500, y: 50 }, unitViewport)).toBe('pointer');
    manager.renderHover(textCtx().ctx, unitViewport);
    expect(tool.glows.at(-1)).toBeGreaterThan(0);
    // The drawings' own layer draws it as it is.
    manager.render(textCtx().ctx, unitViewport);
    expect(tool.glows.at(-1)).toBe(0);
    expect(manager.hoverCursorAt({ x: 500, y: 90 }, unitViewport)).toBeNull();
    const drawn = tool.glows.length;
    manager.renderHover(textCtx().ctx, unitViewport);
    expect(tool.glows.length).toBe(drawn);
  });

  it('draws nothing again on the drawings’ layer as the pointer crosses drawings: the pointer’s layer repaints anyway', () => {
    const { manager } = scene();
    let frames = 0;
    manager.setRequestRender(() => frames++);
    manager.hoverCursorAt({ x: 500, y: 50 }, unitViewport);
    manager.hoverCursorAt({ x: 520, y: 50 }, unitViewport);
    manager.hoverCursorAt({ x: 500, y: 90 }, unitViewport);
    expect(frames).toBe(0);
  });

  it('doesn’t glow once selected: its handles say it is the one', () => {
    const { tool, manager } = scene();
    manager.select('line');
    manager.hoverCursorAt({ x: 500, y: 50 }, unitViewport);
    const drawn = tool.glows.length;
    manager.renderHover(textCtx().ctx, unitViewport);
    expect(tool.glows.length).toBe(drawn);
  });
});

describe('the glow and the lifted handle', () => {
  it('go when the pointer leaves the chart, a tool is picked or the drawing is removed', () => {
    for (const leave of [
      (m: DrawingManager) => m.clearHover(),
      (m: DrawingManager) => m.setActiveTool('horizontalLine'),
      (m: DrawingManager) => m.removeDrawing('line'),
    ]) {
      const { tool, manager } = scene();
      manager.hoverCursorAt({ x: 500, y: 50 }, unitViewport);
      leave(manager);
      tool.glows.length = 0;
      manager.renderHover(textCtx().ctx, unitViewport);
      expect(tool.glows).toEqual([]);
    }
  });

  it('glows on its lines only: its fills and text aren’t drawn again', () => {
    const { manager } = scene();
    manager.hoverCursorAt({ x: 500, y: 50 }, unitViewport);
    const seen: { op: string; blur: number }[] = [];
    const state: Record<string, unknown> = { shadowBlur: 0, lineWidth: 1, globalAlpha: 1 };
    const tracked = new Set(['stroke', 'fill', 'fillText', 'fillRect', 'strokeText']);
    // A context that notes the shadow each stroke, fill and text is drawn with; anything else is a no-op.
    const plain = new Proxy(state, {
      get(target, key: string) {
        if (key in target) return target[key];
        if (tracked.has(key)) return function (this: Record<string, unknown>) { seen.push({ op: key, blur: Number(this.shadowBlur) || 0 }); };
        if (key === 'measureText') return (t: string) => ({ width: t.length * 6 });
        if (key === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
        return () => undefined;
      },
    });
    manager.renderHover(plain as unknown as CanvasRenderingContext2D, unitViewport);
    expect(seen.some((s) => s.op === 'stroke' && s.blur > 0)).toBe(true);
    expect(seen.filter((s) => s.op !== 'stroke')).toEqual([]);
  });
});

describe('handles as a drawing is reshaped and made', () => {
  it('go back to rings as the press ends, with a frame asked for', async () => {
    const { TrendLineTool } = await import('../tools/TrendLine.js');
    const manager = new DrawingManager();
    manager.register(new TrendLineTool());
    manager.setDrawings([drawing('trendLine', [{ time: 2, price: 30 }, { time: 8, price: 70 }], { id: 't' })]);
    manager.select('t');
    let frames = 0;
    manager.setRequestRender(() => frames++);
    // Bar i at x = i·10 + 5, price p at y = 100 − p: the first handle at (25, 70).
    expect(manager.onPointerDown({ x: 25, y: 70 }, unitViewport)).toBe(true);
    manager.onPointerMove({ x: 35, y: 60 }, unitViewport);
    const before = frames;
    manager.onPointerUp();
    expect(frames).toBeGreaterThan(before);
  });

  it('show the first point placed before the pointer moves on, a tap on a phone too', async () => {
    const { TrendLineTool } = await import('../tools/TrendLine.js');
    const manager = new DrawingManager();
    manager.register(new TrendLineTool());
    manager.setActiveTool('trendLine');
    manager.onPointerDown({ x: 25, y: 70 }, unitViewport);
    manager.onPointerUp();
    const arcs: number[][] = [];
    const ctx = new Proxy({} as Record<string, unknown>, {
      get(target, key: string) {
        if (key in target) return target[key];
        if (key === 'arc') return (...a: number[]) => { arcs.push(a); };
        if (key === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
        if (key === 'measureText') return (t: string) => ({ width: t.length * 6 });
        return () => undefined;
      },
    }) as unknown as CanvasRenderingContext2D;
    manager.render(ctx, unitViewport);
    expect(arcs.length).toBeGreaterThan(0);
    // On the middle of a pixel, as handles are.
    expect(Math.abs(arcs[0][0] - 25)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(arcs[0][1] - 70)).toBeLessThanOrEqual(0.5);
  });
});

describe('what a drawing covers on screen', () => {
  it('takes in its tags and its handles where they sit off its points, so a toolbar over it keeps clear', async () => {
    const { PriceRangeTool } = await import('../tools/PriceRange.js');
    const manager = new DrawingManager();
    manager.register(new PriceRangeTool());
    // A rise from 40 to 60 over bars 10..30: its change's tag over the box, above y 40.
    manager.setDrawings([drawing('priceRange', [{ time: 10, price: 40 }, { time: 30, price: 60 }], { id: 'r' })]);
    manager.select('r');
    manager.render(textCtx().ctx, unitViewport);
    const drawn = manager.drawnExtent('r');
    expect(drawn).not.toBeNull();
    expect(drawn!.y).toBeLessThan(40 - 6);
    expect(manager.drawnExtent('none')).toBeNull();
  });
});
