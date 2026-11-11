// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DPRManager, DEFAULT_MAX_PIXEL_RATIO, backingSize, sizeCanvas } from '../DPRManager.js';
import { CanvasLayer } from '../CanvasLayer.js';

let observed: ((entries?: unknown[]) => void) | null = null;
let observedBox: string | undefined;
let mediaListeners: (() => void)[] = [];

beforeEach(() => {
  observed = null;
  mediaListeners = [];
  vi.stubGlobal('ResizeObserver', class {
    constructor(cb: (entries?: unknown[]) => void) { observed = cb; }
    observe(_el: Element, options?: { box?: string }) { observedBox = options?.box; }
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

describe('backingSize — the canvas on the screen’s own pixels', () => {
  it('rounds the CSS size by the ratio where the browser reports no device pixels', () => {
    expect(backingSize({ width: 1450, height: 780 }, 1.25, null)).toEqual({ width: 1813, height: 975, exact: false });
  });

  it('takes the browser’s count of device pixels at 125% and 150%, which rounding misses by one', () => {
    // 1450 CSS px at 1.25 is 1812.5: the box snapped to 1812 on screen, not the 1813 of rounding.
    expect(backingSize({ width: 1450, height: 780 }, 1.25, { width: 1812, height: 975 })).toEqual({ width: 1812, height: 975, exact: true });
    expect(backingSize({ width: 1193, height: 635 }, 1.5, { width: 1790, height: 953 })).toEqual({ width: 1790, height: 953, exact: true });
  });

  it('keeps to rounding when the ratio is capped under the screen’s, or the box has padding the canvases lie over', () => {
    // A 3x phone drawn at 2x: the device box counts 3 px a CSS px.
    expect(backingSize({ width: 390, height: 640 }, 2, { width: 1170, height: 1920 }).exact).toBe(false);
    // 8 px of padding a side at 1.25: the content box is 20 device px narrower than the canvases.
    expect(backingSize({ width: 800, height: 400 }, 1.25, { width: 980, height: 480 }).exact).toBe(false);
    expect(backingSize({ width: 800, height: 400 }, 1.25, { width: 0, height: 0 }).exact).toBe(false);
  });

  it('fills the box with a canvas of its own pixels, and sizes one in CSS px otherwise', () => {
    const canvas = document.createElement('canvas');
    sizeCanvas(canvas, { width: 1450, height: 780 }, 1.25, { width: 1812, height: 975 });
    expect([canvas.width, canvas.height, canvas.style.width, canvas.style.height]).toEqual([1812, 975, '100%', '100%']);
    sizeCanvas(canvas, { width: 1450, height: 780 }, 1.25, null);
    expect([canvas.width, canvas.height, canvas.style.width, canvas.style.height]).toEqual([1813, 975, '1450px', '780px']);
  });
});

describe('DPRManager — the container in device pixels', () => {
  it('asks the browser for the box in device pixels, and resizes when it lands on other pixels at the same size', () => {
    dpr(1.25);
    const manager = new DPRManager(host(1450, 780));
    const onResize = vi.fn();
    manager.onResize(onResize);
    expect(observedBox).toBe('device-pixel-content-box');
    expect(manager.getDeviceSize()).toBeNull();
    observed?.([{ devicePixelContentBoxSize: [{ inlineSize: 1812, blockSize: 975 }] }]);
    expect(manager.getDeviceSize()).toEqual({ width: 1812, height: 975 });
    expect(onResize).toHaveBeenCalledTimes(1);
    // The same box again changes nothing.
    observed?.([{ devicePixelContentBoxSize: [{ inlineSize: 1812, blockSize: 975 }] }]);
    expect(onResize).toHaveBeenCalledTimes(1);
    // Moved by a fraction of a pixel, it snaps a pixel wider at the same CSS size.
    observed?.([{ devicePixelContentBoxSize: [{ inlineSize: 1813, blockSize: 975 }] }]);
    expect(onResize).toHaveBeenCalledTimes(2);
  });

  it('watches the plain box where the browser can’t report device pixels', () => {
    const boxes: (string | undefined)[] = [];
    vi.stubGlobal('ResizeObserver', class {
      observe(_el: Element, options?: { box?: string }) {
        boxes.push(options?.box);
        if (options?.box) throw new TypeError('unknown box');
      }
      disconnect() {}
    });
    const manager = new DPRManager(host());
    manager.onResize(() => {});
    expect(boxes).toEqual(['device-pixel-content-box', undefined]);
    expect(manager.getDeviceSize()).toBeNull();
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
