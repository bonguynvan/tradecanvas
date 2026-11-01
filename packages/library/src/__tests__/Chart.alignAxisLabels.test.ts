// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

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

/** What the chart hands its renderer. */
const renderContext = (c: Chart) => (c as unknown as { engine: { renderCtx: { alignAxisLabels?: boolean } } }).engine.renderCtx;

describe('tags on the price axis that would cover one another', () => {
  it('are moved apart by default', () => {
    chart = new Chart(host, {});
    expect(chart.getFeatures().alignAxisLabels).toBe(true);
    expect(chart.isAxisLabelsAligned()).toBe(true);
    expect(renderContext(chart).alignAxisLabels).toBe(true);
  });

  it('stay on their lines when switched off, by option or at run time', () => {
    chart = new Chart(host, { features: { alignAxisLabels: false } });
    expect(chart.isAxisLabelsAligned()).toBe(false);
    expect(renderContext(chart).alignAxisLabels).toBe(false);
    chart.setAxisLabelsAligned(true);
    expect(chart.isAxisLabelsAligned()).toBe(true);
    expect(renderContext(chart).alignAxisLabels).toBe(true);
  });
});
