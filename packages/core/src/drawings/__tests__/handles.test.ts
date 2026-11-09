import { describe, it, expect, afterEach } from 'vitest';
import { DARK_THEME } from '@tradecanvas/commons';
import { drawAnchorHandles, setHandleFocus } from '../handles.js';
import { handleRadius, setDrawingLook } from '../drawingLook.js';

/** A context that records each circle drawn: where, how big, and the colours it was filled and stroked in. */
function circles() {
  const drawn: { x: number; y: number; r: number; fill?: unknown; stroke?: unknown; width?: number }[] = [];
  const state: Record<string, unknown> = { fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, globalAlpha: 1 };
  let current: (typeof drawn)[number] | null = null;
  const ctx = new Proxy(state, {
    get(target, key) {
      if (key === 'arc') return (x: number, y: number, r: number) => { current = { x, y, r }; drawn.push(current); };
      if (key === 'fill') return () => { if (current) current.fill = target.fillStyle; };
      if (key === 'stroke') return () => { if (current) { current.stroke = target.strokeStyle; current.width = target.lineWidth as number; } };
      if (key === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
      if (key in target) return target[key as string];
      return () => {};
    },
    set(target, key, value) { target[key as string] = value; return true; },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, drawn };
}

const drawing = (id: string, locked = false) => ({
  id,
  type: 'trendLine',
  anchors: [{ time: 0, price: 0 }, { time: 1, price: 1 }],
  style: { color: '#e8505b', lineWidth: 2, lineStyle: 'solid' as const },
  visible: true,
  locked,
});
const points = [{ x: 10, y: 10 }, { x: 50, y: 40 }];

afterEach(() => {
  setHandleFocus(null);
  setDrawingLook(null);
});

describe('handles', () => {
  it('are rings in the line’s colour, filled with the chart’s background, sized to the line', () => {
    setDrawingLook(DARK_THEME);
    setHandleFocus({ primary: 'a', hover: null, drag: null });
    const { ctx, drawn } = circles();
    drawAnchorHandles(ctx, drawing('a'), points);
    expect(drawn).toHaveLength(2);
    for (const c of drawn) {
      expect(c.r).toBeCloseTo(handleRadius(2));
      expect(c.stroke).toBe('#e8505b');
      expect(c.fill).toBe(DARK_THEME.background);
    }
  });

  it('grow under the pointer and fill with the line’s colour while dragged', () => {
    setHandleFocus({ primary: 'a', hover: { id: 'a', index: 0 }, drag: null });
    const hover = circles();
    drawAnchorHandles(hover.ctx, drawing('a'), points);
    expect(hover.drawn[0].r).toBeGreaterThan(hover.drawn[1].r);

    setHandleFocus({ primary: 'a', hover: null, drag: { id: 'a', index: 1 } });
    const drag = circles();
    drawAnchorHandles(drag.ctx, drawing('a'), points);
    // The rings (a dragged one has a soft halo drawn under it first).
    const rings = drag.drawn.filter((c) => c.stroke);
    expect(rings[1].fill).toBe('#e8505b');
    expect(drag.drawn.length).toBe(3);
  });

  it('show as small dots on drawings that can’t be reshaped from them: the others selected, and locked ones', () => {
    setHandleFocus({ primary: 'a', hover: null, drag: null });
    const other = circles();
    drawAnchorHandles(other.ctx, drawing('b'), points);
    expect(other.drawn).toHaveLength(2);
    expect(other.drawn[0].r).toBeLessThan(handleRadius(1));
    expect(other.drawn[0].stroke).toBeUndefined();

    const locked = circles();
    drawAnchorHandles(locked.ctx, drawing('a', true), points);
    expect(locked.drawn[0].r).toBeLessThan(handleRadius(1));
  });

  it('draw side handles, the in-between points of a box, a size smaller', () => {
    setHandleFocus({ primary: 'a', hover: null, drag: null });
    const { ctx, drawn } = circles();
    drawAnchorHandles(ctx, drawing('a'), points, { sides: new Set([1]) });
    expect(drawn[1].r).toBeLessThan(drawn[0].r);
  });
});
