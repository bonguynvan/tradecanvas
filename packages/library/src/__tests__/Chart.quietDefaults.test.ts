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

  it('starts the widget’s settings with the value tags off', () => {
    expect(DEFAULT_SETTINGS.indicatorValueLabels).toBe(false);
  });
});
