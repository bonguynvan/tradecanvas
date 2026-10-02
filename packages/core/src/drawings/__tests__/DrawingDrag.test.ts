import { describe, it, expect } from 'vitest';
import type { DrawingState, ViewportState } from '@tradecanvas/commons';
import { DrawingDrag } from '../DrawingDrag.js';
import { priceToY, timeToX } from '../../viewport/ScaleMapping.js';
import { drawing, unitViewport } from './fixtures.js';

const make = (state: DrawingState) => {
  const drawings = new Map([[state.id, state]]);
  return { drag: new DrawingDrag((id) => drawings.get(id)), state };
};

describe('DrawingDrag', () => {
  it('moves by whole bars, each point keeping its place between bars', () => {
    const { drag, state } = make(drawing('brush', [{ time: 2.3, price: 50 }, { time: 4.6, price: 60 }]));
    drag.beginMove({ x: 50, y: 50 }, [state]);
    drag.move({ x: 81, y: 40 }, unitViewport, undefined); // 3.1 bars right, 10 px up
    expect(state.anchors.map((a) => a.time)).toEqual([5.3, 7.6].map((t) => expect.closeTo(t, 9)) as never);
    expect(state.anchors.map((a) => a.price)).toEqual([60, 70]);
  });

  it('keeps the shape on a log scale: every point moves by the same pixels', () => {
    const log: ViewportState = { ...unitViewport, logScale: true, priceRange: { min: 10, max: 1000 } };
    const { drag, state } = make(drawing('trendLine', [{ time: 1, price: 20 }, { time: 5, price: 200 }]));
    const before = state.anchors.map((a) => priceToY(a.price, log));
    drag.beginMove({ x: 50, y: 50 }, [state]);
    drag.move({ x: 50, y: 30 }, log, undefined);
    const after = state.anchors.map((a) => priceToY(a.price, log));
    expect(after[0] - before[0]).toBeCloseTo(-20, 6);
    expect(after[1] - before[1]).toBeCloseTo(-20, 6);
  });

  it('ignores a wobble of a pixel or two', () => {
    const { drag, state } = make(drawing('trendLine', [{ time: 1, price: 20 }, { time: 5, price: 40 }]));
    drag.beginMove({ x: 50, y: 50 }, [state]);
    drag.move({ x: 51, y: 51 }, unitViewport, undefined);
    expect(state.anchors).toEqual([{ time: 1, price: 20 }, { time: 5, price: 40 }]);
  });

  it('reshapes by a handle, and reports what changed when let go', () => {
    const { drag, state } = make(drawing('trendLine', [{ time: 1, price: 20 }, { time: 5, price: 40 }]));
    drag.beginResize({ x: timeToX(5, unitViewport), y: 60 }, state, 1);
    drag.move({ x: 85, y: 30 }, unitViewport, undefined);
    expect(state.anchors[1]).toEqual({ time: 8, price: 70 });
    const [{ before, drawing: after }] = drag.end();
    expect(before.anchors[1]).toEqual({ time: 5, price: 40 });
    expect(after).toBe(state);
    expect(drag.isActive()).toBe(false);
  });
});
