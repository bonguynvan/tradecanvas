// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const bars: OHLCBar[] = Array.from({ length: 120 }, (_, i) => ({
  time: Date.UTC(2025, 0, 1) + i * 60_000, open: 100, high: 101, low: 99, close: 100 + (i % 3), volume: 5,
}));

let host: HTMLDivElement;
let chart: Chart;

beforeEach(() => {
  installChartStubs();
  host = sizedHost();
  chart = new Chart(host, { chartType: 'candlestick' });
  chart.setData(bars);
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Chart: colours of their own for the profile and the heatmap', () => {
  it('keeps the ones it is given, and takes them back with null', () => {
    chart.setDepthHeatmapConfig({ bidColor: '#1e88e5', askColor: '#fb8c00' });
    chart.setMarketProfileConfig({ valueAreaColor: '#7e57c2', color: '#90a4ae' });
    expect(chart.getDepthHeatmapConfig()).toMatchObject({ bidColor: '#1e88e5', askColor: '#fb8c00' });
    expect(chart.getMarketProfileConfig()).toMatchObject({ valueAreaColor: '#7e57c2', color: '#90a4ae' });
    // Another setting leaves them as they are.
    chart.setDepthHeatmapConfig({ opacity: 0.5 });
    chart.setMarketProfileConfig({ buckets: 64 });
    expect(chart.getDepthHeatmapConfig()).toMatchObject({ opacity: 0.5, bidColor: '#1e88e5' });
    expect(chart.getMarketProfileConfig()).toMatchObject({ buckets: 64, valueAreaColor: '#7e57c2' });
    chart.setDepthHeatmapConfig({ bidColor: null, askColor: null });
    chart.setMarketProfileConfig({ valueAreaColor: null, color: null });
    expect(chart.getDepthHeatmapConfig()).toMatchObject({ bidColor: null, askColor: null });
    expect(chart.getMarketProfileConfig()).toMatchObject({ valueAreaColor: null, color: null });
  });
});

describe('Chart: the profile’s figures and the legend', () => {
  const clearTop = () => (chart as unknown as { marketProfile: { clearTop: number } }).marketProfile.clearTop;

  it('writes them under the legend while it is drawn, and in the corner with none', () => {
    chart.setLegend({ visible: true });
    chart.setMarketProfileVisible(true);
    const top = (chart as unknown as { viewport: { getState(): { chartRect: { y: number } } } }).viewport.getState().chartRect.y;
    expect(clearTop()).toBe(Math.max(0, chart.getLegendBottom() - top));
    expect(clearTop()).toBeGreaterThan(0);
    chart.setLegend({ visible: false });
    chart.setMarketProfileVisible(true);
    expect(clearTop()).toBe(0);
  });
});
