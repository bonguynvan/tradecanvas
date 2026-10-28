// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

/** Long enough for a few frames of the timer-driven requestAnimationFrame. */
const FRAMES_MS = 100;
const HOUR = 3_600_000;
const bars = (n: number): OHLCBar[] => Array.from({ length: n }, (_, i) => ({
  time: Date.UTC(2026, 0, 1) + i * HOUR, open: 100 + i, high: 102 + i, low: 99 + i, close: 101 + i, volume: 1000,
}));

let host: HTMLDivElement;
let chart: Chart;

beforeEach(() => {
  vi.useFakeTimers();
  installChartStubs();
  // A phone's width: the legend's line wraps as it gets longer.
  host = sizedHost(390, 600);
  chart = new Chart(host, {});
  chart.setData(bars(200));
  vi.advanceTimersByTime(FRAMES_MS);
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Chart — 'legendResize'", () => {
  it('fires once the legend is drawn taller, with the new bottom, and not again while it keeps that height', () => {
    const before = chart.getLegendBottom();
    const bottoms: number[] = [];
    chart.on('legendResize', (e) => bottoms.push((e.payload as { bottom: number }).bottom));
    // A status long enough to take a line of its own.
    chart.setStatusText('LIVE · 8 ms · a feed with a long name that wraps');
    vi.advanceTimersByTime(FRAMES_MS);
    expect(chart.getLegendBottom()).toBeGreaterThan(before);
    expect(bottoms).toEqual([chart.getLegendBottom()]);
    chart.setStatusText('LIVE · 8 ms · a feed with a long name that wraps');
    vi.advanceTimersByTime(FRAMES_MS);
    expect(bottoms).toHaveLength(1);
  });

  it('fires when it is drawn shorter again', () => {
    chart.setStatusText('LIVE · 8 ms · a feed with a long name that wraps');
    vi.advanceTimersByTime(FRAMES_MS);
    const tall = chart.getLegendBottom();
    const bottoms: number[] = [];
    chart.on('legendResize', (e) => bottoms.push((e.payload as { bottom: number }).bottom));
    chart.setStatusText(null);
    vi.advanceTimersByTime(FRAMES_MS);
    expect(bottoms).toHaveLength(1);
    expect(bottoms[0]).toBeLessThan(tall);
  });
});
