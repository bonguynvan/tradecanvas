import { describe, it, expect, vi } from 'vitest';
import { PanHandler } from '../PanHandler.js';

describe('PanHandler — 2D drag deltas', () => {
  it('reports both horizontal and vertical deltas, sign = (last - current)', () => {
    const cb = vi.fn();
    const h = new PanHandler(cb);

    h.onPointerDown({ x: 100, y: 100 });
    h.onPointerMove({ x: 90, y: 80 }); // moved left 10, up 20

    expect(cb).toHaveBeenCalledWith(10, 20);
  });

  it('fires the onStart hook on every pointer-down (per-gesture reset point)', () => {
    const onStart = vi.fn();
    const h = new PanHandler(vi.fn(), onStart);

    h.onPointerDown({ x: 0, y: 0 });
    h.onPointerUp();
    h.onPointerDown({ x: 5, y: 5 });

    expect(onStart).toHaveBeenCalledTimes(2);
  });

  it('ignores moves when not dragging', () => {
    const cb = vi.fn();
    const h = new PanHandler(cb);

    h.onPointerMove({ x: 10, y: 10 });

    expect(cb).not.toHaveBeenCalled();
  });

  it('accumulates deltas relative to the previous sample, not the start', () => {
    const cb = vi.fn();
    const h = new PanHandler(cb);

    h.onPointerDown({ x: 0, y: 0 });
    h.onPointerMove({ x: -5, y: -5 }); // (0 - -5) = 5, 5
    h.onPointerMove({ x: -5, y: -12 }); // (-5 - -5) = 0, (-5 - -12) = 7

    expect(cb).toHaveBeenNthCalledWith(1, 5, 5);
    expect(cb).toHaveBeenNthCalledWith(2, 0, 7);
  });
});
