import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

describe('PanHandler — release momentum', () => {
  let frames: FrameRequestCallback[] = [];

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    frames = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal('cancelAnimationFrame', () => { frames = []; });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  /** Drag left by `step` px every 16 ms, `count` times. */
  function flick(h: PanHandler, step: number, count: number): void {
    h.onPointerDown({ x: 500, y: 100 });
    for (let i = 1; i <= count; i++) {
      vi.advanceTimersByTime(16);
      h.onPointerMove({ x: 500 - step * i, y: 100 });
    }
  }

  it('coasts after a flick', () => {
    const cb = vi.fn();
    const h = new PanHandler(cb);
    flick(h, 10, 6);
    cb.mockClear();
    h.onPointerUp();
    expect(frames.length).toBe(1);
    frames.shift()!(0);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0][0]).toBeGreaterThan(0); // keeps scrolling the same way
  });

  it('does not coast when the pointer came to rest before release', () => {
    const cb = vi.fn();
    const h = new PanHandler(cb);
    flick(h, 10, 6);
    vi.advanceTimersByTime(200); // hold still, then let go
    h.onPointerUp();
    expect(frames.length).toBe(0);
  });

  it('caps the coasting speed of a violent flick', () => {
    const cb = vi.fn();
    const h = new PanHandler(cb);
    h.onPointerDown({ x: 1000, y: 100 });
    vi.advanceTimersByTime(1);
    h.onPointerMove({ x: 0, y: 100 }); // 1000 px in 1 ms
    cb.mockClear();
    h.onPointerUp();
    frames.shift()!(0);
    expect(Math.abs(cb.mock.calls[0][0])).toBeLessThanOrEqual(60);
  });

  it('a new press stops coasting', () => {
    const h = new PanHandler(vi.fn());
    flick(h, 10, 6);
    h.onPointerUp();
    expect(frames.length).toBe(1);
    h.onPointerDown({ x: 0, y: 0 });
    expect(frames.length).toBe(0);
  });
});
