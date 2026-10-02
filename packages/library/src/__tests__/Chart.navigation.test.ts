// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const HOUR = 3_600_000;
const T0 = Date.UTC(2025, 0, 1);
const hourly = (n: number): OHLCBar[] =>
  Array.from({ length: n }, (_, i) => ({ time: T0 + i * HOUR, open: 100, high: 101, low: 99, close: 100, volume: 1 }));

type ViewportProbe = {
  viewport: {
    getState(): {
      visibleRange: { from: number; to: number };
      barWidth: number; barSpacing: number; offset: number;
      chartRect: { x: number; width: number };
    };
  };
};

let host: HTMLDivElement;
let chart: Chart;
const state = () => (chart as unknown as ViewportProbe).viewport.getState();
/** The bar index at the centre of the plot. */
const centreBar = () => {
  const vs = state();
  return Math.round((vs.chartRect.width / 2 - vs.barWidth / 2 + vs.offset) / (vs.barWidth + vs.barSpacing));
};

beforeEach(() => {
  installChartStubs();
  host = sizedHost();
  chart = new Chart(host, { chartType: 'candlestick' });
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Chart.goToTime', () => {
  it('centres the bar that contains the time, keeping the zoom', () => {
    chart.setData(hourly(2000));
    const width = state().barWidth;
    expect(chart.goToTime(T0 + 500 * HOUR + 20 * 60_000)).toBe(500);
    expect(centreBar()).toBe(500);
    expect(state().barWidth).toBe(width);
  });

  it('goes to the nearest end for times outside the data', () => {
    chart.setData(hourly(2000));
    expect(chart.goToTime(T0 - 30 * 24 * HOUR)).toBe(0);
    expect(chart.goToTime(T0 + 5000 * HOUR)).toBe(1999);
  });

  it('does nothing without data', () => {
    expect(chart.goToTime(T0)).toBe(-1);
    chart.setData(hourly(10));
    expect(chart.goToTime(Number.NaN)).toBe(-1);
  });
});

describe('Chart.setVisibleRangePreset', () => {
  it('shows the last day, ending at the last bar', () => {
    chart.setData(hourly(2000));
    chart.setVisibleRangePreset('1D');
    const { from, to } = state().visibleRange;
    expect(to).toBe(1999);
    expect(from).toBeGreaterThanOrEqual(1999 - 24);
    expect(from).toBeLessThanOrEqual(1999 - 22);
  });

  it('widens to everything when the span is longer than the data', () => {
    chart.setData(hourly(100)); // few enough to fit at the minimum bar width
    chart.setVisibleRangePreset('1Y');
    expect(state().visibleRange).toEqual({ from: 0, to: 99 });
    chart.setVisibleRangePreset('1D');
    chart.setVisibleRangePreset('All');
    expect(state().visibleRange).toEqual({ from: 0, to: 99 });
  });
});

describe('price panes', () => {
  it('stay upright and linear when the price scale is inverted or logarithmic', () => {
    chart.setData(hourly(300));
    chart.addIndicator('rsi', {});
    chart.setInvertScale(true);
    chart.setLogScale(true);
    const panes = (chart as unknown as { buildPanelRenderInfos(): { viewport: { invertScale?: boolean; logScale?: boolean } }[] })
      .buildPanelRenderInfos();
    expect(panes).toHaveLength(1);
    expect(panes[0].viewport).toMatchObject({ invertScale: false, logScale: false });
    expect(chart.isInvertScale()).toBe(true);
  });
});

describe('bars timed in seconds', () => {
  const seconds = (n: number): OHLCBar[] => hourly(n).map((b) => ({ ...b, time: b.time / 1000 }));

  it('show range presets and go to times in the same unit', () => {
    chart.setData(seconds(2000));
    chart.setVisibleRangePreset('1D');
    const { from, to } = state().visibleRange;
    expect(to).toBe(1999);
    expect(from).toBeGreaterThanOrEqual(1999 - 24);
    expect(chart.goToTime(T0 / 1000 + 500 * 3600)).toBe(500);
  });
});

describe('layout for on-chart labels', () => {
  it('reports where the OHLCV legend ends and where each indicator pane is', () => {
    chart.setData(hourly(300));
    const plot = chart.getPlotRect();
    const below = chart.getLegendBottom();
    expect(below).toBeGreaterThan(plot.y);
    expect(below).toBeLessThan(plot.y + 60);

    const rsi = chart.addIndicator('rsi', {})!;
    chart.addIndicator('ema', {}); // on the price pane: no pane of its own
    const panes = chart.getIndicatorPanes();
    const shrunk = chart.getPlotRect(); // the pane takes its height from the price pane
    expect(panes.map((p) => p.instanceId)).toEqual([rsi]);
    expect(panes[0].rect.y).toBeGreaterThanOrEqual(shrunk.y + shrunk.height - 1);
    expect(panes[0].rect.height).toBeGreaterThan(20);
  });

  it('starts the stack at the plot top when the OHLCV legend is off', () => {
    chart.destroy();
    chart = new Chart(host, { chartType: 'candlestick', features: { legend: false } });
    chart.setData(hourly(300));
    expect(chart.getLegendBottom()).toBe(chart.getPlotRect().y);
  });

  it('says whether a drawn bar is a data bar', () => {
    chart.setData(hourly(300));
    expect(chart.isTimeAligned()).toBe(true);
    chart.setChartType('heikinAshi');
    expect(chart.isTimeAligned()).toBe(true);
    chart.setChartType('renko');
    expect(chart.isTimeAligned()).toBe(false);
  });

  it('says, once per update and after it, from which bar the indicators changed', async () => {
    const bars = hourly(300);
    chart.setData(bars);
    chart.addIndicator('ema', { period: 5 });
    await Promise.resolve(); // setData's own event
    const froms: number[] = [];
    chart.on('indicatorUpdate', (e) => froms.push((e.payload as { from: number }).from));

    chart.updateLastBar({ ...bars[299], close: 101 });
    expect(froms).toEqual([]); // not in the middle of the tick
    await Promise.resolve();
    chart.appendBar({ ...bars[299], time: bars[299].time + HOUR });
    await Promise.resolve();
    chart.setData(hourly(200));
    chart.updateLastBar({ ...hourly(200)[199], close: 99 }); // same task: one event, from the earliest bar
    await Promise.resolve();
    expect(froms).toEqual([299, 299, 0]);
  });

  it('announces a pane resize', () => {
    chart.setData(hourly(300));
    const rsi = chart.addIndicator('rsi', {})!;
    const seen: unknown[] = [];
    chart.on('paneResize', (e) => seen.push(e.payload));
    chart.setPanelSize(rsi, 140);
    expect(seen).toEqual([{ instanceId: rsi, size: 140 }]);
  });

  it('formats prices as the price axis does', () => {
    chart.setData(hourly(300)); // prices around 100
    expect(chart.formatPrice(101.23456)).toBe('101.23');
    chart.setMarket({ pricePrecision: 4 });
    expect(chart.formatPrice(101.23456)).toBe('101.2346');
  });
});
