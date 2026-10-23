// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PHI, type OHLCBar, type ViewportState } from '@tradecanvas/commons';
import { priceToY } from '@tradecanvas/core';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const HOUR = 3_600_000;
const T0 = Date.UTC(2025, 0, 1);
/** Bars swinging between about 100 and 200, with or without volume. */
const swinging = (n: number, volume: number): OHLCBar[] =>
  Array.from({ length: n }, (_, i) => {
    const mid = 150 + 45 * Math.sin(i / 4);
    return { time: T0 + i * HOUR, open: mid - 1, high: mid + 4, low: mid - 4, close: mid + 1, volume };
  });

type Probe = { viewport: { getState(): ViewportState } };

let host: HTMLDivElement;
let chart: Chart;

beforeEach(() => {
  installChartStubs();
  host = sizedHost(900, 500);
  chart = new Chart(host, { chartType: 'candlestick' });
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** The room above the highest visible high, as a share of the plot's height (from the plot's top). */
function roomAbove(data: OHLCBar[]): number {
  const state = (chart as unknown as Probe).viewport.getState();
  const { y, height } = state.chartRect;
  const high = Math.max(...data.slice(state.visibleRange.from, state.visibleRange.to + 1).map((b) => b.high));
  return (priceToY(high, state) - y) / height;
}

/** The room below the lowest visible low, as a share of the plot's height. */
function roomBelow(data: OHLCBar[]): number {
  const state = (chart as unknown as Probe).viewport.getState();
  const { y, height } = state.chartRect;
  const low = Math.min(...data.slice(state.visibleRange.from, state.visibleRange.to + 1).map((b) => b.low));
  return (y + height - priceToY(low, state)) / height;
}

describe('the price scale and the volume band', () => {
  it('keeps the candles above the volume bars, with a gap of φ⁻⁷', () => {
    const data = swinging(120, 50);
    chart.setData(data);
    expect(roomBelow(data)).toBeCloseTo(PHI ** -4.5 + PHI ** -7, 6);
  });

  it('gives the band back to a chart started with volume off', () => {
    chart.destroy();
    chart = new Chart(host, { chartType: 'candlestick', features: { volume: false } });
    const data = swinging(120, 50);
    chart.setData(data);
    expect(roomBelow(data)).toBeCloseTo(PHI ** -5, 6);
  });

  it('keeps the band at the bottom of the screen on an upside-down scale', () => {
    const data = swinging(120, 50);
    chart.setData(data);
    chart.setInvertScale(true);
    // Upside down, the highest high is nearest the bottom edge: the band is under it.
    const state = (chart as unknown as Probe).viewport.getState();
    const { y, height } = state.chartRect;
    const high = Math.max(...data.slice(state.visibleRange.from, state.visibleRange.to + 1).map((b) => b.high));
    expect((y + height - priceToY(high, state)) / height).toBeCloseTo(PHI ** -4.5 + PHI ** -7, 6);
    expect(roomAbove(data)).toBeGreaterThan(0);
  });

  it('gives the band back when there is no volume to show', () => {
    const quiet = swinging(120, 0);
    chart.setData(quiet);
    expect(roomBelow(quiet)).toBeCloseTo(PHI ** -5, 6);

    const data = swinging(120, 50);
    chart.setData(data);
    chart.setVolumeVisible(false);
    expect(roomBelow(data)).toBeCloseTo(PHI ** -5, 6);
    chart.setVolumeVisible(true);
    expect(roomBelow(data)).toBeCloseTo(PHI ** -4.5 + PHI ** -7, 6);
  });
});
