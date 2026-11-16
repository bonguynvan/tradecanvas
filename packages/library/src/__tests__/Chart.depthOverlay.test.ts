// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { DepthData, OHLCBar } from '@tradecanvas/commons';
import { DepthOverlay } from '@tradecanvas/core';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const HOUR = 3_600_000;
const T0 = Date.UTC(2026, 0, 5);
const bars: OHLCBar[] = Array.from({ length: 60 }, (_, i) => ({
  time: T0 + i * HOUR, open: 100, high: 101, low: 99, close: 100.5, volume: 10,
}));
const book: DepthData = { bids: [{ price: 99.5, volume: 5 }], asks: [{ price: 100.5, volume: 3 }] };

let host: HTMLDivElement;
let chart: Chart | undefined;

beforeEach(() => {
  vi.useFakeTimers();
  installChartStubs();
  host = sizedHost();
});

afterEach(() => {
  chart?.destroy();
  chart = undefined;
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

/** What the overlay was last asked to draw, after a frame. */
function drawn(c: Chart) {
  const render = vi.spyOn(DepthOverlay.prototype, 'render');
  c.setData(bars);
  c.setDepthData(book);
  vi.advanceTimersByTime(100);
  return render;
}

describe('the order book on the plot', () => {
  it('draws with features.depth, with trading off: no orders, no trading layer', () => {
    chart = new Chart(host, { features: { trading: false, depth: true } });
    const render = drawn(chart);
    expect(render).toHaveBeenCalled();
    const [, depth, , config] = render.mock.calls[render.mock.calls.length - 1];
    expect(depth).toEqual(book);
    expect(config.enabled).toBe(true);
  });

  it('is the live market’s book: not drawn beside a replay’s price, drawn again after it', () => {
    chart = new Chart(host, { features: { trading: false, depth: true } });
    const render = drawn(chart);
    chart.replayStart({ startIndex: 10, paused: true });
    vi.advanceTimersByTime(100);
    render.mockClear();
    chart.setDepthData(book);
    vi.advanceTimersByTime(100);
    expect(render).not.toHaveBeenCalled();
    chart.replayStop();
    vi.advanceTimersByTime(100);
    expect(render).toHaveBeenCalled();
  });

  it('draws nothing with trading off and depth off', () => {
    chart = new Chart(host, { features: { trading: false } });
    chart.setDepthOverlay({ enabled: true });
    expect(drawn(chart)).not.toHaveBeenCalled();
  });

  it('stays off with trading on until it is turned on, as it was before', () => {
    chart = new Chart(host, {});
    expect(drawn(chart)).not.toHaveBeenCalled();
    chart.setTradingConfig({ depthOverlay: { enabled: true, mode: 'level' } });
    vi.advanceTimersByTime(100);
    expect(chart.getDepthOverlay()).toMatchObject({ enabled: true, mode: 'level' });
    expect(DepthOverlay.prototype.render).toHaveBeenCalled();
  });

  it('takes its look from the options and from setDepthOverlay, keeping what is not changed', () => {
    chart = new Chart(host, { features: { depth: true }, depthOverlay: { mode: 'level', markBest: true } });
    expect(chart.getDepthOverlay()).toMatchObject({ enabled: true, mode: 'level', markBest: true });
    chart.setDepthOverlay({ maxWidth: 160 });
    expect(chart.getDepthOverlay()).toMatchObject({ enabled: true, mode: 'level', markBest: true, maxWidth: 160 });
    chart.setDepthOverlay({ enabled: false });
    expect(drawn(chart)).not.toHaveBeenCalled();
  });

  it('turns on and off with setFeatures', () => {
    chart = new Chart(host, { features: { trading: false } });
    chart.setFeatures({ depth: true });
    expect(drawn(chart)).toHaveBeenCalled();
    vi.restoreAllMocks();
    installChartStubs();
    chart.setFeatures({ depth: false });
    vi.advanceTimersByTime(100);
    expect(chart.getDepthOverlay().enabled).toBe(false);
  });

  it('hands a row size to the drawing', () => {
    chart = new Chart(host, { features: { trading: false, depth: true }, depthOverlay: { rowSize: 0.5 } });
    const render = drawn(chart);
    expect(render.mock.calls[render.mock.calls.length - 1][3].rowSize).toBe(0.5);
  });

  it('hands a row origin to the drawing, set later as well', () => {
    chart = new Chart(host, { features: { trading: false, depth: true }, depthOverlay: { rowSize: 1.25, rowOrigin: -0.125 } });
    const render = drawn(chart);
    expect(render.mock.calls[render.mock.calls.length - 1][3]).toMatchObject({ rowSize: 1.25, rowOrigin: -0.125 });
    chart.setDepthOverlay({ rowOrigin: 0 });
    expect(chart.getDepthOverlay()).toMatchObject({ rowSize: 1.25, rowOrigin: 0 });
    // Unset again: the rows are centred on multiples of the size once more.
    chart.setDepthOverlay({ rowOrigin: undefined });
    expect(chart.getDepthOverlay().rowOrigin).toBeUndefined();
  });

  it('is cleared with null', () => {
    chart = new Chart(host, { features: { depth: true } });
    const render = drawn(chart);
    render.mockClear();
    chart.setDepthData(null);
    vi.advanceTimersByTime(100);
    expect(render).not.toHaveBeenCalled();
  });
});
