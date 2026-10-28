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
    chart.on('legendResize', (e) => bottoms.push(e.payload.bottom));
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
    chart.on('legendResize', (e) => bottoms.push(e.payload.bottom));
    chart.setStatusText(null);
    vi.advanceTimersByTime(FRAMES_MS);
    expect(bottoms).toHaveLength(1);
    expect(bottoms[0]).toBeLessThan(tall);
  });
});

describe('Chart — what drawing labels keep clear of', () => {
  type Box = { x: number; y: number; width: number; height: number };
  const keepOut = (): readonly Box[] =>
    (chart as unknown as { drawingRenderer: { getKeepOut(): readonly Box[] } }).drawingRenderer.getKeepOut();

  it('is the OHLCV rows as drawn, and what a host stacks under them', () => {
    const plot = chart.getPlotRect();
    const bottom = chart.getLegendBottom();
    const [rows] = keepOut();
    expect(rows).toMatchObject({ x: plot.x, y: plot.y, height: bottom - plot.y });
    expect(rows.width).toBeGreaterThan(0);
    chart.setLegendStack({ width: 180, height: 50 });
    expect(keepOut()).toContainEqual({ x: plot.x, y: bottom, width: 180, height: 50 });
    chart.setLegendStack(null);
    expect(keepOut()).toHaveLength(1);
  });

  it('is nothing with the legend hidden and nothing stacked', () => {
    chart.setLegend({ visible: false });
    vi.advanceTimersByTime(FRAMES_MS);
    expect(keepOut()).toEqual([]);
  });
});
