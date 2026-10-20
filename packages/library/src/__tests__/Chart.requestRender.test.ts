// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import type { OverlayPlugin } from '../plugins/index.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const MIN = 60_000;
const bars: OHLCBar[] = Array.from({ length: 50 }, (_, i) => ({
  time: Date.UTC(2026, 0, 1) + i * MIN, open: 100, high: 101, low: 99, close: 100, volume: 1,
}));

let host: HTMLDivElement;
let chart: Chart;

beforeEach(() => {
  installChartStubs();
  vi.useFakeTimers();
  host = sizedHost();
  chart = new Chart(host, {});
  chart.setData(bars);
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** An overlay that draws whatever mode it is in, counting its frames. */
function modalOverlay(): OverlayPlugin & { mode: string; frames: string[] } {
  const plugin = {
    mode: 'delta',
    frames: [] as string[],
    descriptor: { id: 'modal', name: 'Modal' },
    render() {
      plugin.frames.push(plugin.mode);
    },
  };
  return plugin as OverlayPlugin & { mode: string; frames: string[] };
}

describe('chart.requestRender', () => {
  it('draws a frame when nothing else would, as after a plugin’s own setting changed', async () => {
    const overlay = modalOverlay();
    chart.plugins.register({ kind: 'overlay', plugin: overlay });
    await vi.advanceTimersByTimeAsync(200);
    overlay.frames.length = 0;

    overlay.mode = 'volume';
    await vi.advanceTimersByTimeAsync(200);
    expect(overlay.frames).toEqual([]);

    chart.requestRender();
    await vi.advanceTimersByTimeAsync(200);
    expect(overlay.frames).toContain('volume');
  });

  it('runs one frame for several requests in a row', async () => {
    const overlay = modalOverlay();
    chart.plugins.register({ kind: 'overlay', plugin: overlay });
    await vi.advanceTimersByTimeAsync(200);
    overlay.frames.length = 0;

    chart.requestRender();
    chart.requestRender();
    chart.requestRender();
    await vi.advanceTimersByTimeAsync(200);
    expect(overlay.frames).toHaveLength(1);
  });

  it('leaves an overlay that says it is switched off undrawn, until it is on again', async () => {
    const overlay = modalOverlay();
    chart.plugins.register({ kind: 'overlay', plugin: overlay });
    overlay.enabled = false;
    chart.requestRender();
    await vi.advanceTimersByTimeAsync(200);
    expect(overlay.frames).toEqual([]);
    expect(chart.plugins.list().some((p) => p.kind === 'overlay' && p.plugin === overlay)).toBe(true);

    overlay.enabled = true;
    chart.requestRender();
    await vi.advanceTimersByTimeAsync(200);
    expect(overlay.frames.length).toBeGreaterThan(0);
  });

  it('does nothing on a destroyed chart, even with a frame already asked for', async () => {
    const overlay = modalOverlay();
    chart.plugins.register({ kind: 'overlay', plugin: overlay });
    await vi.advanceTimersByTimeAsync(200);
    overlay.frames.length = 0;
    const events = vi.fn();
    chart.on('visibleRangeChange', events);

    chart.requestRender();
    chart.destroy();
    expect(() => chart.requestRender()).not.toThrow();
    await vi.advanceTimersByTimeAsync(200);
    expect(overlay.frames).toEqual([]);
    expect(events).not.toHaveBeenCalled();
  });
});
