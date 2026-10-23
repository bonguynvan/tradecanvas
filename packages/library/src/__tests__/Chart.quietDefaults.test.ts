// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';
import { DEFAULT_SETTINGS } from '../widget/widgetConfig.js';

let host: HTMLDivElement;
let chart: Chart;

beforeEach(() => {
  installChartStubs();
  host = sizedHost();
});

afterEach(() => {
  chart?.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('a quiet chart by default', () => {
  it('tags no indicator values on the axes until asked', () => {
    chart = new Chart(host, {});
    expect(chart.getFeatures().indicatorValueLabels).toBe(false);
    chart.setIndicatorValueLabelsVisible(true);
    expect(chart.getFeatures().indicatorValueLabels).toBe(true);
    chart.destroy();
    chart = new Chart(host, { features: { indicatorValueLabels: true } });
    expect(chart.getFeatures().indicatorValueLabels).toBe(true);
  });

  it('names the symbol, interval and exchange in the legend’s title line', () => {
    chart = new Chart(host, {});
    const probe = chart as unknown as { setStreamTarget(s: string, t: string): void; chartLegend: { title(): string } };
    probe.setStreamTarget('BTCUSDT', '5m');
    chart.setSymbolInfo({ symbol: 'BTCUSDT', exchange: 'Binance' });
    expect(probe.chartLegend.title()).toBe('BTCUSDT · 5m · Binance');
    // A name of the host's own stands until the symbol changes.
    chart.setSymbolName('Bitcoin');
    expect(probe.chartLegend.title()).toBe('Bitcoin · 5m · Binance');
    probe.setStreamTarget('ETHUSDT', '1h');
    chart.setSymbolInfo({ symbol: 'ETHUSDT' });
    expect(probe.chartLegend.title()).toBe('ETHUSDT · 1h');
  });

  it('starts the widget’s settings with the value tags off', () => {
    expect(DEFAULT_SETTINGS.indicatorValueLabels).toBe(false);
  });
});
