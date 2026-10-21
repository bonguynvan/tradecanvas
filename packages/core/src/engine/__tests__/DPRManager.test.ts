// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DPRManager, DEFAULT_MAX_PIXEL_RATIO } from '../DPRManager.js';
import { CanvasLayer } from '../CanvasLayer.js';

let observed: (() => void) | null = null;
let mediaListeners: (() => void)[] = [];

beforeEach(() => {
  observed = null;
  mediaListeners = [];
  vi.stubGlobal('ResizeObserver', class {
    constructor(cb: () => void) { observed = cb; }
    observe() {}
    disconnect() {}
  });
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { cb(0); return 1; });
  vi.stubGlobal('matchMedia', () => ({
    addEventListener: (_: string, cb: () => void) => mediaListeners.push(cb),
    removeEventListener: () => {},
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(window, 'devicePixelRatio', { value: 1, configurable: true });
});

const dpr = (value: number) => Object.defineProperty(window, 'devicePixelRatio', { value, configurable: true });

function host(w = 390, h = 640): HTMLDivElement {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { value: w, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: h, configurable: true });
  return el;
}

describe('DPRManager — pixel ratio cap', () => {
  it('draws a 3x phone screen at 2x by default', () => {
    dpr(3);
    expect(DEFAULT_MAX_PIXEL_RATIO).toBe(2);
    expect(new DPRManager(host()).getDpr()).toBe(2);
  });

  it('keeps a lower ratio as it is, and the full ratio when the cap is lifted', () => {
    dpr(1.5);
    expect(new DPRManager(host()).getDpr()).toBe(1.5);
    dpr(3);
    expect(new DPRManager(host(), Infinity).getDpr()).toBe(3);
  });

  it('resizes when the cap changes, though the size did not', () => {
    dpr(3);
    const manager = new DPRManager(host());
    const calls: number[] = [];
    manager.onResize((_size, ratio) => calls.push(ratio));
    manager.setMaxPixelRatio(3);
    expect(calls).toEqual([3]);
    expect(manager.getDpr()).toBe(3);
  });

  it('resizes when the screen’s ratio changes with the size the same (a window moved to another screen)', () => {
    dpr(1);
    const manager = new DPRManager(host());
    const calls: number[] = [];
    manager.onResize((_size, ratio) => calls.push(ratio));
    dpr(2);
    for (const cb of [...mediaListeners]) cb();
    expect(calls).toEqual([2]);
    // And a size callback with nothing changed stays quiet.
    observed?.();
    expect(calls).toEqual([2]);
  });
});

describe('CanvasLayer — destroy', () => {
  it('gives its backing store back, so a remounted chart doesn’t add up on a phone', () => {
    const container = document.createElement('div');
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ setTransform() {}, clearRect() {} } as never);
    const layer = new CanvasLayer(container, 1);
    layer.resize({ width: 390, height: 640 }, 2);
    expect(layer.canvas.width).toBe(780);
    layer.destroy();
    expect(layer.canvas.width).toBe(0);
    expect(layer.canvas.height).toBe(0);
    expect(container.contains(layer.canvas)).toBe(false);
  });
});
