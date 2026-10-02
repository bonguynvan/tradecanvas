// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { IndicatorPlugin, IndicatorValue, OHLCBar } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const HOUR = 3_600_000;
const T0 = Date.UTC(2025, 0, 1);
const hourly = (n: number): OHLCBar[] =>
  Array.from({ length: n }, (_, i) => ({ time: T0 + i * HOUR, open: 100, high: 101, low: 99, close: 100, volume: 5000 + i }));

/** An overlay that follows volume: thousands, far from the price. */
const volumeLine: IndicatorPlugin = {
  descriptor: {
    id: 'volLine', name: 'Volume line', placement: 'overlay', defaultConfig: {},
    plots: [{ key: 'value', title: 'Vol', color: 0 }],
  },
  calculate(data) {
    const values = new Map<number, IndicatorValue>();
    const series = data.map((bar) => {
      const v = { value: bar.volume };
      values.set(bar.time, v);
      return v;
    });
    return { values, series };
  },
  render() {},
};

let host: HTMLDivElement;
let chart: Chart;
const plotX = () => chart.getPlotRect().x;
const priceMax = () => (chart as unknown as { viewport: { getState(): { priceRange: { max: number } } } }).viewport.getState().priceRange.max;

beforeEach(() => {
  installChartStubs();
  host = sizedHost();
  chart = new Chart(host, { chartType: 'candlestick' });
  chart.registerIndicator(volumeLine);
  chart.setData(hourly(300));
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Chart left price scale', () => {
  it('is hidden until an overlay goes on it, then makes room on the left', () => {
    expect(chart.isLeftPriceScaleShown()).toBe(false);
    expect(plotX()).toBe(0);
    chart.addIndicator('volLine', {}, 'bottom', { scale: 'left' });
    expect(chart.isLeftPriceScaleShown()).toBe(true);
    expect(plotX()).toBeGreaterThan(0);
  });

  it('fits the left scale to its overlays and leaves the price scale alone', () => {
    chart.addIndicator('volLine', {}, 'bottom', { scale: 'left' });
    expect(priceMax()).toBeLessThan(200);
    const left = chart.getLeftPriceRange();
    expect(left!.min).toBeGreaterThan(4000);
    expect(left!.max).toBeGreaterThan(5000);
  });

  it('moves an overlay between scales', () => {
    const id = chart.addIndicator('volLine', {})!;
    expect(priceMax()).toBeGreaterThan(5000); // on the price scale, it stretches it
    const changes: string[] = [];
    chart.on('indicatorChange', (e) => changes.push((e.payload as { change: string }).change));
    expect(chart.setIndicatorScale(id, 'left')).toBe(true);
    expect(priceMax()).toBeLessThan(200);
    expect(chart.getIndicatorScale(id)).toBe('left');
    expect(changes).toEqual(['scale']);
    chart.setIndicatorScale(id, 'right');
    expect(chart.isLeftPriceScaleShown()).toBe(false);
  });

  it('mirrors the price scale on the left when asked to show it', () => {
    chart.setLeftPriceScaleVisible(true);
    expect(chart.isLeftPriceScaleShown()).toBe(true);
    expect(plotX()).toBeGreaterThan(0);
    expect(chart.getLeftPriceRange()).toEqual((chart as unknown as { viewport: { getState(): { priceRange: unknown } } }).viewport.getState().priceRange);
    chart.setLeftPriceScaleVisible(false);
    expect(plotX()).toBe(0);
  });

  it('keeps the scale in a saved layout', () => {
    chart.addIndicator('volLine', {}, 'bottom', { scale: 'left' });
    const saved = chart.saveState()!;
    chart.destroy();
    chart = new Chart(host, { chartType: 'candlestick' });
    chart.registerIndicator(volumeLine);
    chart.setData(hourly(300));
    chart.loadState(saved);
    const [restored] = chart.getActiveIndicators();
    expect(chart.getIndicatorScale(restored.instanceId)).toBe('left');
    expect(chart.isLeftPriceScaleShown()).toBe(true);
  });

  it('starts with ChartOptions.leftPriceScale', () => {
    const other = new Chart(sizedHost(), { leftPriceScale: true });
    expect(other.isLeftPriceScaleShown()).toBe(true);
    other.destroy();
  });
});
