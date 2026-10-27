// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Chart } from '../Chart.js';
import { installChartStubs } from './chartTestEnv.js';

const FRAME_MS = 20;

let observed: (() => void)[] = [];
let host: HTMLDivElement;
let width = 800;

beforeEach(() => {
  vi.useFakeTimers();
  installChartStubs();
  observed = [];
  // The container's own observer, as a browser calls it after a window resize.
  vi.stubGlobal('ResizeObserver', class {
    constructor(cb: () => void) { observed.push(cb); }
    observe() {}
    unobserve() {}
    disconnect() {}
  });
  width = 800;
  host = document.createElement('div');
  Object.defineProperty(host, 'clientWidth', { get: () => width });
  Object.defineProperty(host, 'clientHeight', { get: () => 400 });
  document.body.appendChild(host);
});

afterEach(() => {
  host.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Chart — a container that changes size by itself', () => {
  it("emits 'resize' when the container's observer reports a new size", () => {
    const chart = new Chart(host, {});
    const sizes: { width: number; height: number }[] = [];
    chart.on('resize', (event) => sizes.push(event.payload));

    width = 390;
    for (const cb of observed) cb();
    vi.advanceTimersByTime(FRAME_MS);

    expect(sizes).toEqual([{ width: 390, height: 400 }]);
    chart.destroy();
  });
});
