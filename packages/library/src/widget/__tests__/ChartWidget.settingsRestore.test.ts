// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { DataAdapter, OHLCBar } from '@tradecanvas/commons';
import { installChartStubs, sizedHost } from '../../__tests__/chartTestEnv.js';
import { ChartWidget } from '../ChartWidget.js';
import type { ChartSettingsState } from '../types.js';

const MINUTE = 60_000;
const LOW = 100;
const HIGH = 110;
/** Bars between `LOW` and `HIGH`, a minute apart. */
const BARS: OHLCBar[] = Array.from({ length: 60 }, (_, i) => ({
  time: i * MINUTE, open: LOW + 4, high: HIGH, low: LOW, close: LOW + 6, volume: 10,
}));
/** A symbol trading far above `HIGH`. */
const FAR = 5_000;

let host: HTMLDivElement;
let widget: ChartWidget;

/** The price range on the real chart's axis. */
const priceRange = () =>
  (widget.getChart() as unknown as { viewport: { getState(): { priceRange: { min: number; max: number } } } })
    .viewport.getState().priceRange;

beforeEach(() => {
  localStorage.clear();
  installChartStubs();
  host = sizedHost();
});

afterEach(() => {
  widget.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('ChartWidget settings given back on the next visit', () => {
  it('shows the bars when the settings carry auto-scale off from a drag', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    // What a listener got after a drag on the price axis and a change in the settings.
    const saved: Partial<ChartSettingsState> = { ...widget.getSettings(), autoScale: false, gridVisible: false };
    widget.setSettings(saved);
    widget.setData(BARS);
    // The axis spans the bars, not the 0 to 1 of a chart that never fitted any.
    const { min, max } = priceRange();
    expect(min).toBeLessThanOrEqual(LOW);
    expect(max).toBeGreaterThanOrEqual(HIGH);
    expect(max - min).toBeLessThan(2 * (HIGH - LOW));
    expect(widget.getChart().isAutoScale()).toBe(true);
  });

  it('fits the next symbol’s bars when the settings turn auto-scale off after the bars', async () => {
    const feed: DataAdapter = {
      name: 'fake',
      connect: () => {},
      disconnect: () => {},
      getConnectionState: () => 'connected',
      fetchHistory: async (symbol: string) => BARS.map((b) => (symbol === 'FAR' ? { ...b, open: b.open + FAR, high: b.high + FAR, low: b.low + FAR, close: b.close + FAR } : b)),
      on: () => {},
      off: () => {},
      dispose: () => {},
    };
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false, timeframe: '1m', adapter: feed });
    await vi.waitFor(() => expect(widget.getChart().getData()).toHaveLength(BARS.length));
    // Given back late: the bars came first.
    widget.setSettings({ autoScale: false });
    await widget.setSymbol('FAR');
    await vi.waitFor(() => expect(widget.getChart().getData()[0]?.low).toBe(LOW + FAR));
    const { min, max } = priceRange();
    expect(min).toBeLessThanOrEqual(LOW + FAR);
    expect(max).toBeGreaterThanOrEqual(HIGH + FAR);
    expect(max - min).toBeLessThan(2 * (HIGH - LOW));
    expect(widget.getChart().isAutoScale()).toBe(false);
  });
});
