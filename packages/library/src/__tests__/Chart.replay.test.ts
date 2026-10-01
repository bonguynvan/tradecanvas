// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';

/** jsdom has no 2D context: a recorder that accepts any call or assignment. */
function fakeContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
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

function bars(n: number): OHLCBar[] {
  const t0 = Date.UTC(2026, 0, 1);
  return Array.from({ length: n }, (_, i) => {
    const p = 100 + Math.sin(i / 5) * 3;
    return { time: t0 + i * 60_000, open: p, high: p + 1, low: p - 1, close: p + 0.5, volume: 1000 };
  });
}

type ViewportProbe = {
  viewport: {
    getState(): { visibleRange: { from: number; to: number } };
    isAtEnd(): boolean;
    scrollBy(deltaPixels: number): void;
  };
};

let host: HTMLDivElement;
let chart: Chart;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 16));
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('Path2D', class { moveTo() {} lineTo() {} rect() {} arc() {} closePath() {} });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    return fakeContext(this) as never;
  });
  host = document.createElement('div');
  Object.defineProperty(host, 'clientWidth', { value: 800 });
  Object.defineProperty(host, 'clientHeight', { value: 400 });
  document.body.appendChild(host);
  chart = new Chart(host, { chartType: 'candlestick' });
  chart.setData(bars(300));
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const probe = () => (chart as unknown as ViewportProbe).viewport;

describe('Chart replay', () => {
  it('keeps the newest replayed bar on screen as bars arrive', () => {
    chart.replayStart({ startIndex: 20, interval: 100, speed: 1 });
    for (let step = 1; step <= 150; step++) {
      vi.advanceTimersByTime(100);
      const newest = 20 + step - 1;
      const { to } = probe().getState().visibleRange;
      expect(to, `step ${step}`).toBeGreaterThanOrEqual(newest);
    }
    expect(probe().isAtEnd()).toBe(true);
  });

  it('starts at the replay position, not where the full series was scrolled', () => {
    // Look at old history first, then replay from bar 40.
    probe().scrollBy(-5000);
    chart.replayStart({ startIndex: 40, interval: 100, speed: 1 });
    vi.advanceTimersByTime(100);
    const { from, to } = probe().getState().visibleRange;
    expect(to).toBeGreaterThanOrEqual(40);
    expect(from).toBeLessThanOrEqual(40);
  });

  it('stops following while the user looks at history, like live data', () => {
    chart.replayStart({ startIndex: 150, interval: 100, speed: 1 });
    vi.advanceTimersByTime(100);
    probe().scrollBy(-3000); // drag back into history
    const before = probe().getState().visibleRange;
    vi.advanceTimersByTime(500);
    expect(probe().getState().visibleRange).toEqual(before);
  });

  it('jumps forward to the scrubbed bar even while the user looks at history', () => {
    chart.replayStart({ startIndex: 150, interval: 100, speed: 1 });
    vi.advanceTimersByTime(100);
    chart.replayPause();
    probe().scrollBy(-3000);
    chart.replaySeek(250);
    const { from, to } = probe().getState().visibleRange;
    expect(to).toBeGreaterThanOrEqual(250);
    expect(from).toBeLessThanOrEqual(250);
  });

  it('starts over at the new position when replay is restarted', () => {
    chart.replayStart({ startIndex: 200, interval: 100, speed: 1 });
    vi.advanceTimersByTime(300);
    chart.replayStop();
    chart.replayStart({ startIndex: 30, interval: 100, speed: 1 });
    vi.advanceTimersByTime(100);
    const { from, to } = probe().getState().visibleRange;
    expect(to).toBeGreaterThanOrEqual(30);
    expect(from).toBeLessThanOrEqual(30);
  });

  it('jumps to the scrubbed bar on seek', () => {
    chart.replayStart({ startIndex: 200, interval: 100, speed: 1 });
    vi.advanceTimersByTime(100);
    chart.replayPause();
    chart.replaySeek(60);
    const { from, to } = probe().getState().visibleRange;
    expect(to).toBeGreaterThanOrEqual(60);
    expect(from).toBeLessThanOrEqual(60);
  });
});
