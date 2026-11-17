// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { DataAdapter, IndicatorPlugin, IndicatorValue, OHLCBar } from '@tradecanvas/commons';
import { installChartStubs, sizedHost } from '../../__tests__/chartTestEnv.js';
import { Chart } from '../../Chart.js';
import { ChartWidget } from '../ChartWidget.js';

const BARS: OHLCBar[] = Array.from({ length: 60 }, (_, i) => ({
  time: i * 60_000, open: 100, high: 101, low: 99, close: 100 + (i % 5), volume: 10,
}));

/** An app's own indicator: the close, as one line. */
const closeLine: IndicatorPlugin = {
  descriptor: { id: 'tdk-close', name: 'Close line', placement: 'overlay', defaultConfig: {}, plots: [{ key: 'value', title: 'Close', color: 0 }] },
  calculate(data) {
    const values = new Map<number, IndicatorValue>();
    const series = data.map((bar) => {
      const v = { value: bar.close };
      values.set(bar.time, v);
      return v;
    });
    return { values, series };
  },
  render() {},
};

/** A feed that gives `BARS` for any symbol: the widget restores a symbol's layout once its bars are in. */
const feed = (): DataAdapter => ({
  name: 'fake',
  connect: () => {},
  disconnect: () => {},
  getConnectionState: () => 'connected',
  fetchHistory: async () => BARS,
  on: () => {},
  off: () => {},
  dispose: () => {},
});

const KEY = 'tcw:layout:AAA';
let hosts: HTMLDivElement[];
let widget: ChartWidget | null;

/** A layout for symbol AAA, saved where the widget looks for it, that names the app's indicator. */
function saveLayoutWithIndicator(): void {
  const host = sizedHost();
  hosts.push(host);
  const chart = new Chart(host, { plugins: [{ kind: 'indicator', plugin: closeLine }] });
  chart.setData(BARS);
  chart.addIndicator('tdk-close');
  chart.saveState(KEY);
  chart.destroy();
}

beforeEach(() => {
  localStorage.clear();
  installChartStubs();
  hosts = [];
  widget = null;
});

afterEach(() => {
  widget?.destroy();
  for (const host of hosts) host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("a widget given the app's plugins", () => {
  it('registers them before it restores the saved layout, so their indicators come back', async () => {
    saveLayoutWithIndicator();
    const host = sizedHost();
    hosts.push(host);
    widget = new ChartWidget(host, {
      symbol: 'AAA', timeframe: '1m', watchlist: false, persistLayouts: true, adapter: feed(),
      plugins: [{ kind: 'indicator', plugin: closeLine }],
    });
    const chart = widget.getChart();
    await vi.waitFor(() => expect(chart.getActiveIndicators().map((ind) => ind.id)).toContain('tdk-close'));
  });

  it('registers them before it opens a view shared in the URL', async () => {
    const first = sizedHost();
    hosts.push(first);
    const sharer = new ChartWidget(first, { symbol: 'AAA', watchlist: false, plugins: [{ kind: 'indicator', plugin: closeLine }] });
    sharer.setData(BARS);
    sharer.getChart().addIndicator('tdk-close');
    const encoded = sharer.exportState();
    sharer.destroy();

    location.hash = `#tcw=${encodeURIComponent(encoded)}`;
    try {
      const host = sizedHost();
      hosts.push(host);
      widget = new ChartWidget(host, {
        symbol: 'AAA', timeframe: '1m', watchlist: false, shareUrl: true, adapter: feed(),
        plugins: [{ kind: 'indicator', plugin: closeLine }],
      });
      const chart = widget.getChart();
      await vi.waitFor(() => expect(chart.getActiveIndicators().map((ind) => ind.id)).toContain('tdk-close'));
    } finally {
      location.hash = '';
    }
  });

  it("puts its own plugins over chartOptions' for the same id", () => {
    const host = sizedHost();
    hosts.push(host);
    const renamed: IndicatorPlugin = { ...closeLine, descriptor: { ...closeLine.descriptor, name: 'From chartOptions' } };
    widget = new ChartWidget(host, {
      symbol: 'AAA', watchlist: false,
      plugins: [{ kind: 'indicator', plugin: closeLine }],
      chartOptions: { plugins: [{ kind: 'indicator', plugin: renamed }] },
    });
    expect(widget.getChart().getAvailableIndicators().find((d) => d.id === 'tdk-close')?.name).toBe('Close line');
  });

  it('lists them with the built-ins for adding', () => {
    const host = sizedHost();
    hosts.push(host);
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false, plugins: [{ kind: 'indicator', plugin: closeLine }] });
    widget.setData(BARS);
    expect(widget.getChart().getAvailableIndicators().map((d) => d.id)).toContain('tdk-close');
    expect(widget.getChart().addIndicator('tdk-close')).toBeTruthy();
  });

  it("adds them to the chart's own plugins", () => {
    const host = sizedHost();
    hosts.push(host);
    const other: IndicatorPlugin = { ...closeLine, descriptor: { ...closeLine.descriptor, id: 'tdk-other' } };
    widget = new ChartWidget(host, {
      symbol: 'AAA', watchlist: false,
      plugins: [{ kind: 'indicator', plugin: closeLine }],
      chartOptions: { plugins: [{ kind: 'indicator', plugin: other }] },
    });
    const ids = widget.getChart().getAvailableIndicators().map((d) => d.id);
    expect(ids).toEqual(expect.arrayContaining(['tdk-close', 'tdk-other']));
  });
});
