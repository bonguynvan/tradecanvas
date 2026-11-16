// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { DepthData, OHLCBar } from '@tradecanvas/commons';
import { DepthHeatmapRenderer } from '@tradecanvas/core';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const HOUR = 3_600_000;
const T0 = Date.UTC(2026, 0, 5);
const bars: OHLCBar[] = Array.from({ length: 60 }, (_, i) => ({
  time: T0 + i * HOUR, open: 100, high: 101, low: 99, close: 100.5, volume: 10,
}));
const book: DepthData = { bids: [{ price: 99, volume: 5 }], asks: [{ price: 101, volume: 3 }] };

let host: HTMLDivElement;
let chart: Chart;

beforeEach(() => {
  installChartStubs();
  host = sizedHost();
  chart = new Chart(host, {});
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('depth heatmap snapshots', () => {
  it('stamps a snapshot at the latest bar, or at the time given for an older one', () => {
    chart.setData(bars);
    const push = vi.spyOn(DepthHeatmapRenderer.prototype, 'push');
    chart.pushDepthSnapshot(book);
    chart.pushDepthSnapshot(book, T0 + 3 * HOUR);
    expect(push.mock.calls.map(([time]) => time)).toEqual([T0 + 59 * HOUR, T0 + 3 * HOUR]);
  });

  it('records nothing with no bars and no time, or with a time that is not a number', () => {
    const push = vi.spyOn(DepthHeatmapRenderer.prototype, 'push');
    chart.pushDepthSnapshot(book);
    chart.pushDepthSnapshot(book, Number.NaN);
    chart.pushDepthSnapshot(book, Number.POSITIVE_INFINITY);
    expect(push).not.toHaveBeenCalled();
    // A recorded book may come before the bars.
    chart.pushDepthSnapshot(book, T0);
    expect(push).toHaveBeenCalledTimes(1);
  });
});

describe('depth heatmap during a replay', () => {
  // Frames run on fake timers: a chart made before them would wait on a real one.
  beforeEach(() => {
    chart.destroy();
    host.remove();
    vi.useFakeTimers();
    installChartStubs();
    host = sizedHost();
    chart = new Chart(host, {});
  });
  afterEach(() => vi.useRealTimers());

  /** Where the snapshots drawn in the next frame are (one strip each). */
  function drawnStrips(): number[] {
    const draw = vi.spyOn(DepthHeatmapRenderer.prototype as never as { drawSide: (...a: unknown[]) => void }, 'drawSide');
    chart.setDepthHeatmapVisible(true);
    vi.advanceTimersByTime(100);
    const strips = new Set(draw.mock.calls.map((call) => call[4] as number));
    draw.mockRestore();
    return [...strips];
  }

  it('stamps a live book at the live series’ last bar, not the bar the replay is on', () => {
    chart.setData(bars);
    chart.replayStart({ startIndex: 10, paused: true });
    const push = vi.spyOn(DepthHeatmapRenderer.prototype, 'push');
    chart.pushDepthSnapshot(book);
    expect(push.mock.calls.map(([time]) => time)).toEqual([T0 + 59 * HOUR]);
  });

  it('draws only the books of the bars the replay has shown, and all of them again after it', () => {
    chart.setData(bars);
    chart.pushDepthSnapshot(book, T0 + 5 * HOUR);
    chart.pushDepthSnapshot(book, T0 + 30 * HOUR);
    chart.pushDepthSnapshot(book);
    expect(drawnStrips()).toHaveLength(3);
    // The view reaches past the replay's last bar, where the later books would be.
    const wide = () => chart.setVisibleRange(T0, T0 + 70 * HOUR);
    chart.replayStart({ startIndex: 10, paused: true });
    wide();
    expect(drawnStrips()).toHaveLength(1);
    chart.replaySeekToBar(40);
    wide();
    expect(drawnStrips()).toHaveLength(2);
    chart.replayStop();
    vi.advanceTimersByTime(100);
    expect(drawnStrips()).toHaveLength(3);
  });
});
