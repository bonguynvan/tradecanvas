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
