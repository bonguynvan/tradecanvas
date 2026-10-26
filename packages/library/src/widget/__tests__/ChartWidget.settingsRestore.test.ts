// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
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
});
