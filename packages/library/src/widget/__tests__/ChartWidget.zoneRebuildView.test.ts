// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ChartOptions, OHLCBar, ViewportState } from '@tradecanvas/commons';
import { installChartStubs, sizedHost } from '../../__tests__/chartTestEnv.js';
import { ChartWidget } from '../ChartWidget.js';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const DAYS = 300;
const WIDTH = 1200;
const HEIGHT = 600;

/** A local history of hours, climbing: the widget builds its days from them. */
const hours = (): OHLCBar[] => Array.from({ length: 24 * DAYS }, (_, i) => {
  const price = 100 + i * 0.05;
  return { time: Date.UTC(2026, 0, 5) + i * HOUR, open: price, high: price + 1, low: price - 1, close: price + 0.05, volume: 10 };
});

type Viewport = { isAtEnd(): boolean; getState(): ViewportState };

let host: HTMLDivElement;
let widget: ChartWidget;

const viewport = (): Viewport => (widget.getChart() as unknown as { viewport: Viewport }).viewport;
const barUnit = (): number => {
  const { barWidth, barSpacing } = viewport().getState();
  return barWidth + barSpacing;
};

/** A widget on days built from hours, laid out, no zone yet: its days start at UTC's midnight. */
function make(chartOptions: Partial<ChartOptions> = {}): void {
  widget = new ChartWidget(host, { symbol: 'AAA', timeframe: '1d', watchlist: false, chartOptions });
  widget.setData(hours());
  widget.getChart().resize();
}

beforeEach(() => {
  localStorage.clear();
  installChartStubs();
  // The chart's own box inside the widget: jsdom lays nothing out.
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(WIDTH);
  vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(HEIGHT);
  host = sizedHost(WIDTH, HEIGHT);
});

afterEach(() => {
  widget.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('ChartWidget building its days again for the exchange’s zone', () => {
  it('stays at the live edge, at the same zoom, when the view was there', () => {
    make();
    expect(viewport().isAtEnd()).toBe(true);
    const unit = barUnit();
    widget.getChart().setSymbolInfo({ symbol: 'AAA', timeZone: 'America/New_York' });
    expect(viewport().isAtEnd()).toBe(true);
    expect(barUnit()).toBeCloseTo(unit, 9);
  });

  it('keeps the newest bricks on screen on Renko', () => {
    make({ chartType: 'renko' });
    const shown = () => viewport().getState().visibleRange;
    const before = shown().to - shown().from;
    widget.getChart().setSymbolInfo({ symbol: 'AAA', timeZone: 'America/New_York' });
    expect(viewport().isAtEnd()).toBe(true);
    expect(shown().to - shown().from).toBeGreaterThanOrEqual(before - 1);
  });

  it.each(['America/New_York', 'Asia/Ho_Chi_Minh'])('scrolled back, keeps the day on the left edge and the zoom: %s', (timeZone) => {
    make();
    const chart = widget.getChart();
    chart.scrollBars(-100);
    const unit = barUnit();
    const from = chart.getVisibleTimeRange()!.from;
    chart.setSymbolInfo({ symbol: 'AAA', timeZone });
    const bars = chart.getData();
    const first = bars.findIndex((bar) => bar.time === chart.getVisibleTimeRange()!.from);
    // The day now on the left edge holds the most of the one there before: its middle.
    const midday = from + DAY / 2;
    expect(bars[first].time).toBeLessThanOrEqual(midday);
    expect(bars[first + 1].time).toBeGreaterThan(midday);
    expect(barUnit()).toBeCloseTo(unit, 9);
    expect(viewport().isAtEnd()).toBe(false);
  });
});
