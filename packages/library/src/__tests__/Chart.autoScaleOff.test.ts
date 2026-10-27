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
/** More bars than the screen holds. */
const MANY = 300;
/** `count` bars climbing a price a bar from 100, a minute apart. */
const climb = (count: number): OHLCBar[] => Array.from({ length: count }, (_, i) => ({
  time: i * MINUTE, open: 100 + i, high: 101 + i, low: 99 + i, close: 100.5 + i, volume: 10,
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

  it('fits its first bars when they come one by one, while they all fit on screen', () => {
    chart = new Chart(host, { autoScale: false });
    // Climbing a price a bar: fitted to the first bar only, the later ones would leave the screen.
    const bars = climb(BARS);
    for (const bar of bars) chart.appendBar(bar);
    expect(priceRange().min).toBeLessThanOrEqual(bars[0].low);
    expect(priceRange().max).toBeGreaterThanOrEqual(bars[BARS - 1].high);
  });

  it('holds the range once bars that came one by one no longer fit on screen', () => {
    chart = new Chart(host, { autoScale: false });
    const bars = climb(MANY);
    for (const bar of bars.slice(0, -1)) chart.appendBar(bar);
    const before = priceRange();
    chart.appendBar({ ...bars[MANY - 1], high: 5_000, close: 5_000 });
    expect(priceRange()).toEqual(before);
  });

  it('holds the range from where it is turned off while its first bars come one by one', () => {
    chart = new Chart(host, { autoScale: false });
    const bars = climb(BARS);
    for (const bar of bars.slice(0, 10)) chart.appendBar(bar);
    chart.setAutoScale(false);
    const before = priceRange();
    for (const bar of bars.slice(10)) chart.appendBar(bar);
    expect(priceRange()).toEqual(before);
  });

  it('holds the range a drag of the price axis left while its first bars come one by one', () => {
    chart = new Chart(host, { autoScale: false });
    const bars = climb(BARS);
    for (const bar of bars.slice(0, 10)) chart.appendBar(bar);
    const plot = chart.getPlotRect();
    const press = (type: string, y: number) => host.dispatchEvent(new MouseEvent(type, {
      clientX: plot.x + plot.width + 10, clientY: y, button: 0, buttons: type === 'mouseup' ? 0 : 1, bubbles: true,
    }));
    press('mousedown', 100);
    press('mousemove', 160);
    press('mouseup', 160);
    expect(chart.isAutoScale()).toBe(false);
    const dragged = priceRange();
    for (const bar of bars.slice(10)) chart.appendBar(bar);
    expect(priceRange()).toEqual(dragged);
  });

  it('fits bars set before the chart has a size once it gets one', () => {
    let width = 0;
    let height = 0;
    const hidden = document.createElement('div');
    Object.defineProperty(hidden, 'clientWidth', { get: () => width });
    Object.defineProperty(hidden, 'clientHeight', { get: () => height });
    document.body.appendChild(hidden);
    chart = new Chart(hidden, { autoScale: false });
    const bars = climb(MANY);
    chart.setData(bars);
    // A tab or a panel shown: the chart gets its size.
    width = 800;
    height = 400;
    chart.resize();
    expect(priceRange().max).toBeGreaterThanOrEqual(bars[MANY - 1].high);
    expect(priceRange().min).toBeGreaterThan(bars[0].high);
    hidden.remove();
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
