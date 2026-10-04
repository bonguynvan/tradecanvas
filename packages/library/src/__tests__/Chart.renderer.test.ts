// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import type { GpuRenderer } from '@tradecanvas/core';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const loadWebGLRenderer = vi.hoisted(() => vi.fn<(mode: 'webgl' | 'auto') => Promise<GpuRenderer | null>>());
vi.mock('@tradecanvas/core', async (original) => ({
  ...(await original<typeof import('@tradecanvas/core')>()),
  loadWebGLRenderer,
}));

const { Chart } = await import('../Chart.js');

const HOUR = 3_600_000;
const T0 = Date.UTC(2026, 0, 5);
const bars: OHLCBar[] = Array.from({ length: 50 }, (_, i) => ({
  time: T0 + i * HOUR, open: 100, high: 101, low: 99, close: 100.5, volume: 10,
}));

function fakeGpu() {
  const canvas = document.createElement('canvas');
  let lost: (() => void) | null = null;
  const gpu = {
    canvas,
    label: 'test GPU',
    render: vi.fn(() => ({ series: true, volume: true, background: true })),
    onLost: (cb: () => void) => { lost = cb; },
    destroy: vi.fn(() => canvas.remove()),
  };
  return { gpu: gpu as GpuRenderer & typeof gpu, lose: () => lost?.() };
}

let host: HTMLDivElement;
let chart: InstanceType<typeof Chart>;
let changes: unknown[];
/** False once a test has destroyed the chart itself. */
let alive: boolean;

function makeChart(options: ConstructorParameters<typeof Chart>[1] = {}) {
  chart = new Chart(host, options);
  chart.setData(bars);
  chart.on('rendererChange', (e) => changes.push(e.payload));
}

beforeEach(() => {
  installChartStubs();
  loadWebGLRenderer.mockReset();
  changes = [];
  alive = true;
  host = sizedHost();
});

afterEach(() => {
  if (alive) chart.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Chart renderer', () => {
  it('draws with Canvas 2D unless asked otherwise, and loads no WebGL', () => {
    makeChart();
    expect(chart.getRenderer()).toBe('canvas');
    expect(loadWebGLRenderer).not.toHaveBeenCalled();
  });

  it('switches to WebGL and back, saying so each time', async () => {
    makeChart();
    const { gpu } = fakeGpu();
    loadWebGLRenderer.mockResolvedValue(gpu);
    await expect(chart.setRenderer('webgl')).resolves.toBe('webgl');
    expect(chart.getRenderer()).toBe('webgl');
    expect(host.contains(gpu.canvas)).toBe(true);

    await expect(chart.setRenderer('canvas')).resolves.toBe('canvas');
    expect(gpu.destroy).toHaveBeenCalled();
    expect(host.contains(gpu.canvas)).toBe(false);
    expect(changes).toEqual([{ renderer: 'webgl' }, { renderer: 'canvas' }]);
  });

  it('keeps the GPU it has when asked for WebGL again', async () => {
    makeChart();
    const { gpu } = fakeGpu();
    loadWebGLRenderer.mockResolvedValue(gpu);
    await chart.setRenderer('webgl');
    await expect(chart.setRenderer('auto')).resolves.toBe('webgl');
    expect(loadWebGLRenderer).toHaveBeenCalledTimes(1);
    expect(gpu.destroy).not.toHaveBeenCalled();
    expect(changes).toEqual([{ renderer: 'webgl' }]);
  });

  it('stays on Canvas 2D where WebGL 2 is missing, and says why', async () => {
    makeChart();
    loadWebGLRenderer.mockResolvedValue(null);
    await expect(chart.setRenderer('webgl')).resolves.toBe('canvas');
    expect(changes).toEqual([{ renderer: 'canvas', reason: 'unsupported' }]);
  });

  it('passes auto through, for the loader to turn down a software GPU', async () => {
    makeChart();
    loadWebGLRenderer.mockResolvedValue(null);
    await chart.setRenderer('auto');
    expect(loadWebGLRenderer).toHaveBeenCalledWith('auto');
  });

  it('starts loading WebGL at once when the options ask for it', async () => {
    const { gpu } = fakeGpu();
    loadWebGLRenderer.mockResolvedValue(gpu);
    makeChart({ renderer: 'webgl' });
    expect(loadWebGLRenderer).toHaveBeenCalledWith('webgl');
    await vi.waitFor(() => expect(chart.getRenderer()).toBe('webgl'));
  });

  it('goes back to Canvas 2D when the GPU context is lost', async () => {
    makeChart();
    const { gpu, lose } = fakeGpu();
    loadWebGLRenderer.mockResolvedValue(gpu);
    await chart.setRenderer('webgl');
    lose();
    expect(chart.getRenderer()).toBe('canvas');
    expect(changes.at(-1)).toEqual({ renderer: 'canvas', reason: 'contextLost' });
  });

  it('lets a later call win over an earlier one still loading', async () => {
    makeChart();
    const { gpu } = fakeGpu();
    let resolve!: (g: GpuRenderer) => void;
    loadWebGLRenderer.mockReturnValue(new Promise((r) => { resolve = r; }));
    const first = chart.setRenderer('webgl');
    await chart.setRenderer('canvas');
    resolve(gpu);
    await expect(first).resolves.toBe('canvas');
    expect(gpu.destroy).toHaveBeenCalled();
    expect(chart.getRenderer()).toBe('canvas');
  });

  it('drops a GPU that arrives after the chart is gone', async () => {
    makeChart();
    const { gpu } = fakeGpu();
    let resolve!: (g: GpuRenderer) => void;
    loadWebGLRenderer.mockReturnValue(new Promise((r) => { resolve = r; }));
    const pending = chart.setRenderer('webgl');
    chart.destroy();
    alive = false;
    resolve(gpu);
    await pending;
    expect(gpu.destroy).toHaveBeenCalled();
    expect(host.contains(gpu.canvas)).toBe(false);
  });

  it('draws the GPU canvas again right before a screenshot reads it', async () => {
    makeChart();
    const { gpu } = fakeGpu();
    loadWebGLRenderer.mockResolvedValue(gpu);
    await chart.setRenderer('webgl');
    gpu.render.mockClear();
    chart.screenshotDataURL();
    expect(gpu.render).toHaveBeenCalledTimes(1);
  });
});
