import { vi } from 'vitest';

/** jsdom has no 2D context: a recorder that accepts any call or assignment. */
export function fakeContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const store: Record<string | symbol, unknown> = { canvas };
  return new Proxy(store, {
    get: (target, prop) => {
      if (prop in target) return target[prop];
      if (prop === 'measureText') return (t: string) => ({ width: String(t).length * 6 });
      if (prop === 'getImageData' || prop === 'createImageData') return () => ({ data: new Uint8ClampedArray(4) });
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient' || prop === 'createPattern') {
        return () => ({ addColorStop: () => {} });
      }
      return () => {};
    },
    set: (target, prop, value) => {
      target[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

/**
 * Lets a real Chart run under jsdom: fake 2D contexts, a timer-driven
 * requestAnimationFrame (so fake timers drive frames), and stubs for the
 * browser APIs jsdom lacks. Undo with `vi.restoreAllMocks()` and
 * `vi.unstubAllGlobals()`.
 */
export function installChartStubs(): void {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 16));
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('Path2D', class { moveTo() {} lineTo() {} rect() {} arc() {} closePath() {} });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    return fakeContext(this) as never;
  });
}

/** An attached host element with a fixed size (jsdom has no layout). */
export function sizedHost(width = 800, height = 400): HTMLDivElement {
  const host = document.createElement('div');
  Object.defineProperty(host, 'clientWidth', { value: width });
  Object.defineProperty(host, 'clientHeight', { value: height });
  document.body.appendChild(host);
  return host;
}
