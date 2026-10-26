// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { DataAdapter, OHLCBar, TimeFrame, ViewportState } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const MINUTE = 60_000;
const BARS = 60;
/** How far a band of bars spans in price, from its low to its high. */
const SPAN = 10;

/** Bars between `low` and `low + SPAN`, a minute apart. */
const band = (low: number, from = 0): OHLCBar[] => Array.from({ length: BARS }, (_, i) => ({
  time: (from + i) * MINUTE, open: low + 4, high: low + SPAN, low, close: low + 6, volume: 10,
}));

let host: HTMLDivElement;
let chart: Chart;

const priceRange = () => (chart as unknown as { viewport: { getState(): ViewportState } }).viewport.getState().priceRange;

/** The axis spans the band from `low`, not much more: fitted to it. */
function expectFitted(low: number): void {
  const { min, max } = priceRange();
  expect(min).toBeLessThanOrEqual(low);
  expect(max).toBeGreaterThanOrEqual(low + SPAN);
  expect(max - min).toBeLessThan(2 * SPAN);
}

beforeEach(() => {
  installChartStubs();
  host = sizedHost();
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Chart with auto-scale off', () => {
  it('fits its first bars, and leaves auto-scale off', () => {
    chart = new Chart(host, { autoScale: false });
    chart.setData(band(100));
    expectFitted(100);
    expect(chart.isAutoScale()).toBe(false);
    // Off: a price far above holds the range as it is.
    const before = priceRange();
    chart.updateLastBar({ ...band(100)[BARS - 1], high: 500, close: 500 });
    expect(priceRange()).toEqual(before);
  });

  it('fits its first bars when turned off before them', () => {
    chart = new Chart(host, {});
    chart.setAutoScale(false);
    chart.setData(band(100));
    expectFitted(100);
    expect(chart.isAutoScale()).toBe(false);
  });

  it('fits its first bars when they come one by one', () => {
    chart = new Chart(host, { autoScale: false });
    for (const bar of band(100)) chart.appendBar(bar);
    expectFitted(100);
  });

  it('fits each new series setData gives, and holds the range in between', () => {
    chart = new Chart(host, {});
    chart.setData(band(100));
    chart.setAutoScale(false);
    chart.appendBar({ ...band(100, BARS)[0], high: 500, close: 500 });
    expect(priceRange().max).toBeLessThan(500);
    chart.setData(band(5_000));
    expectFitted(5_000);
    expect(chart.isAutoScale()).toBe(false);
  });

  it('fits a stream’s first bars and each symbol it switches to', async () => {
    const lows: Record<string, number> = { AAA: 100, BBB: 5_000 };
    const feed: DataAdapter = {
      name: 'fake',
      connect: () => {},
      disconnect: () => {},
      getConnectionState: () => 'connected',
      fetchHistory: async (symbol: string, _timeframe: TimeFrame) => band(lows[symbol]),
      on: () => {},
      off: () => {},
      dispose: () => {},
    };
    chart = new Chart(host, { autoScale: false });
    await chart.connect({ adapter: feed, symbol: 'AAA', timeframe: '1m', historyLimit: BARS });
    await vi.waitFor(() => expect(chart.getData()).toHaveLength(BARS));
    expectFitted(lows.AAA);
    await chart.switchStream('BBB', '1m');
    await vi.waitFor(() => expect(chart.getData()[0]?.low).toBe(lows.BBB));
    expectFitted(lows.BBB);
    expect(chart.isAutoScale()).toBe(false);
  });
});
