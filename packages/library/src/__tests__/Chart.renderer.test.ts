// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import type { GpuRenderer } from '@tradecanvas/core';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

/** The renderer each load makes: a fake GPU, or null for no WebGL 2. */
const loadWebGLRenderer = vi.hoisted(() => vi.fn<(mode: 'webgl' | 'auto') => Promise<GpuRenderer | null>>());
vi.mock('@tradecanvas/core', async (original) => {
  const core = await original<typeof import('@tradecanvas/core')>();
  return {
    ...core,
    // As the real one: a context claimed first, then the renderer, which lets it go when destroyed.
    loadWebGL: async (mode: 'webgl' | 'auto') => {
      const release = core.claimGpuContext();
      if (!release) return { gpu: null, reason: 'limit' };
      const gpu = await loadWebGLRenderer(mode);
      if (!gpu) {
        release();
        return { gpu: null, reason: 'unsupported' };
      }
      (gpu as { release?: () => void }).release = release;
      return { gpu };
    },
  };
});

const { Chart } = await import('../Chart.js');
const { setMaxWebGLCharts, DEFAULT_MAX_WEBGL_CHARTS, gpuContextsLeft } = await import('@tradecanvas/core');

const HOUR = 3_600_000;
const T0 = Date.UTC(2026, 0, 5);
const bars: OHLCBar[] = Array.from({ length: 50 }, (_, i) => ({
  time: T0 + i * HOUR, open: 100, high: 101, low: 99, close: 100.5, volume: 10,
}));

function fakeGpu() {
  const canvas = document.createElement('canvas');
  let lost: (() => void) | null = null;
  let restored: (() => void) | null = null;
  const gpu = {
    canvas,
    label: 'test GPU',
    render: vi.fn(() => ({ series: true, volume: true, background: true, recorded: true })),
    // Records nothing: every step stays with Canvas 2D.
    recorder: () => ({ region: () => ({ step: () => false, drawText: () => {} }) }),
    onLost: (cb: () => void) => { lost = cb; },
    onRestored: (cb: () => void) => { restored = cb; },
    release: undefined as (() => void) | undefined,
    destroy: vi.fn(() => { gpu.release?.(); canvas.remove(); }),
  };
  return { gpu: gpu as GpuRenderer & typeof gpu, lose: () => lost?.(), restore: () => restored?.() };
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
  setMaxWebGLCharts(DEFAULT_MAX_WEBGL_CHARTS);
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

  it('draws with the GPU again when its context comes back, saying so', async () => {
    makeChart();
    const { gpu, lose, restore } = fakeGpu();
    loadWebGLRenderer.mockResolvedValue(gpu);
    await chart.setRenderer('webgl');
    lose();
    expect(gpu.destroy).not.toHaveBeenCalled();
    restore();
    expect(chart.getRenderer()).toBe('webgl');
    expect(changes.at(-1)).toEqual({ renderer: 'webgl', reason: 'contextRestored' });
    expect(loadWebGLRenderer).toHaveBeenCalledTimes(1);
  });

  it('waits with Canvas 2D while the charts hold as many WebGL contexts as they may, then takes one', async () => {
    setMaxWebGLCharts(0);
    makeChart();
    const { gpu } = fakeGpu();
    loadWebGLRenderer.mockResolvedValue(gpu);
    await expect(chart.setRenderer('webgl')).resolves.toBe('canvas');
    expect(loadWebGLRenderer).not.toHaveBeenCalled();
    expect(changes.at(-1)).toEqual({ renderer: 'canvas', reason: 'limit' });
    setMaxWebGLCharts(1);
    await vi.waitFor(() => expect(chart.getRenderer()).toBe('webgl'));
    expect(changes.at(-1)).toEqual({ renderer: 'webgl' });
  });

  it('takes the context a superseded call lets go, rather than give up on it', async () => {
    setMaxWebGLCharts(1);
    makeChart();
    const first = fakeGpu();
    const second = fakeGpu();
    let resolve!: (g: GpuRenderer) => void;
    loadWebGLRenderer.mockReturnValueOnce(new Promise((r) => { resolve = r; })).mockResolvedValueOnce(second.gpu);
    const superseded = chart.setRenderer('webgl');
    const latest = chart.setRenderer('auto');
    resolve(first.gpu);
    await superseded;
    await latest;
    await vi.waitFor(() => expect(chart.getRenderer()).toBe('webgl'));
    expect(first.gpu.destroy).toHaveBeenCalled();
    expect(changes).not.toContainEqual(expect.objectContaining({ reason: 'unsupported' }));
    expect(gpuContextsLeft()).toBe(0);
  });

  it('says it waits for a WebGL context in time for a listener added right after it was made', async () => {
    setMaxWebGLCharts(0);
    chart = new Chart(host, { renderer: 'webgl' });
    chart.on('rendererChange', (e) => changes.push(e.payload));
    await vi.waitFor(() => expect(changes).toEqual([{ renderer: 'canvas', reason: 'limit' }]));
  });

  it('stops waiting for a WebGL context once set to Canvas 2D, or destroyed', async () => {
    setMaxWebGLCharts(0);
    makeChart();
    await chart.setRenderer('auto');
    await chart.setRenderer('canvas');
    const other = new Chart(sizedHost(), {});
    await other.setRenderer('webgl');
    other.destroy();
    setMaxWebGLCharts(2);
    await Promise.resolve();
    await Promise.resolve();
    expect(loadWebGLRenderer).not.toHaveBeenCalled();
    expect(chart.getRenderer()).toBe('canvas');
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
