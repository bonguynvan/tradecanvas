// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ChartOptions, OHLCBar, TimeFrame } from '@tradecanvas/commons';

/** Stand-in for the canvas-backed Chart: the data it is given, the ranges it is asked for. */
class FakeChart {
  static last: FakeChart;
  data: OHLCBar[] = [];
  presets: string[] = [];

  constructor(_host: HTMLElement, public options: ChartOptions) {
    FakeChart.last = this;
    return new Proxy(this, {
      get: (target, key, receiver) =>
        key in target ? Reflect.get(target, key, receiver) : () => undefined,
    });
  }

  on(): () => void { return () => {}; }
  setData(data: OHLCBar[]): void { this.data = data; }
  getData(): OHLCBar[] { return this.data; }
  setVisibleRangePreset(preset: string): void { this.presets.push(preset); }
  getPlotRect() { return { x: 0, y: 0, width: 1100, height: 500 }; }
  getActiveIndicators(): unknown[] { return []; }
  getIndicatorPanes(): unknown[] { return []; }
  getLegendBottom(): number { return 40; }
  isTimeAligned(): boolean { return true; }
  isTimeframeAllowed(tf: TimeFrame): boolean {
    const allowed = this.options.features?.timeframes ?? [];
    return allowed.length === 0 || allowed.includes(tf);
  }
}

vi.mock('../../Chart.js', () => ({ Chart: FakeChart }));

const { ChartWidget } = await import('../ChartWidget.js');

const DAY = 86_400_000;
/** Weekday bars from 2000 to October 2026. */
function weekdays(): OHLCBar[] {
  const out: OHLCBar[] = [];
  for (let t = Date.UTC(2000, 6, 28); t <= Date.UTC(2026, 9, 20); t += DAY) {
    const dow = new Date(t).getUTCDay();
    if (dow !== 0 && dow !== 6) out.push({ time: t, open: 1, high: 2, low: 0.5, close: 1.5, volume: 1 });
  }
  return out;
}

let host: HTMLDivElement;
let widget: InstanceType<typeof ChartWidget>;

beforeEach(() => {
  localStorage.clear();
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  widget.destroy();
  host.remove();
});

const range = async (preset: string) => {
  host.querySelector<HTMLButtonElement>(`[data-range="${preset}"]`)!.click();
  // The switch may wait a frame to veil a slow resample.
  await new Promise((resolve) => setTimeout(resolve, 50));
};

describe('ChartWidget range bar and timeframes', () => {
  it('shows five years in weeks and everything in months, then comes back to days', async () => {
    widget = new ChartWidget(host, { symbol: 'AAA', timeframe: '1d', watchlist: false });
    widget.setData(weekdays());
    await range('5Y');
    expect(widget.getTimeframe()).toBe('1w');
    expect(FakeChart.last.data.length).toBeLessThan(1500);
    expect(FakeChart.last.presets.at(-1)).toBe('5Y');
    await range('All');
    expect(widget.getTimeframe()).toBe('1M');
    await range('1Y');
    expect(widget.getTimeframe()).toBe('1d');
    expect(FakeChart.last.presets).toEqual(['5Y', 'All', '1Y']);
  });

  it('leaves the timeframe alone when the range fits it', async () => {
    widget = new ChartWidget(host, { symbol: 'AAA', timeframe: '1d', watchlist: false });
    widget.setData(weekdays());
    await range('1Y');
    expect(widget.getTimeframe()).toBe('1d');
  });

  it('keeps the user’s timeframe when the switch is off', async () => {
    widget = new ChartWidget(host, { symbol: 'AAA', timeframe: '1d', watchlist: false, features: { 'statusBar.rangeTimeframe': false } });
    widget.setData(weekdays());
    await range('5Y');
    expect(widget.getTimeframe()).toBe('1d');
    expect(FakeChart.last.presets).toEqual(['5Y']);
  });

  it('only offers timeframes the chart allows', async () => {
    widget = new ChartWidget(host, { symbol: 'AAA', timeframe: '1d', watchlist: false, chartOptions: { features: { timeframes: ['1d', '1M'] } } });
    widget.setData(weekdays());
    await range('5Y');
    expect(widget.getTimeframe()).toBe('1M');
  });

  it('shows only the last of two quick clicks', async () => {
    widget = new ChartWidget(host, { symbol: 'AAA', timeframe: '1d', watchlist: false });
    widget.setData(weekdays());
    host.querySelector<HTMLButtonElement>('[data-range="5Y"]')!.click();
    await range('1Y');
    expect(widget.getTimeframe()).toBe('1d');
    expect(FakeChart.last.presets).toEqual(['1Y']);
  });

  it('lets the user’s own pick win over a range on its way, and keeps to it after', async () => {
    widget = new ChartWidget(host, { symbol: 'AAA', timeframe: '1d', watchlist: false });
    widget.setData(weekdays());
    host.querySelector<HTMLButtonElement>('[data-range="5Y"]')!.click();
    await widget.setTimeframe('1M');
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(widget.getTimeframe()).toBe('1M');
    expect(FakeChart.last.presets).toEqual([]);
    await range('1Y');
    expect(widget.getTimeframe()).toBe('1M');
  });

  it('saves the user’s timeframe in the layout, not the range’s', async () => {
    widget = new ChartWidget(host, { symbol: 'AAA', timeframe: '1d', watchlist: false });
    widget.setData(weekdays());
    await range('5Y');
    expect(widget.getTimeframe()).toBe('1w');
    expect(widget.captureLayout().timeframe).toBe('1d');
  });

  it('keeps the timeframe when the bars can’t be resampled', async () => {
    widget = new ChartWidget(host, { symbol: 'AAA', timeframe: '1d', watchlist: false, resampleTimeframes: false });
    widget.setData(weekdays());
    await range('5Y');
    expect(widget.getTimeframe()).toBe('1d');
    expect(FakeChart.last.presets).toEqual(['5Y']);
  });
});

