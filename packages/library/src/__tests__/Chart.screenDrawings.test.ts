// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const T0 = Date.UTC(2025, 0, 1);
const bars: OHLCBar[] = Array.from({ length: 200 }, (_, i) => ({
  time: T0 + i * 60_000, open: 100, high: 101, low: 99, close: 100 + (i % 5), volume: 5,
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

describe('a drawing kept to the screen', () => {
  it('shows at its share of the plot, and stays there as the chart scrolls', () => {
    const id = chart.addDrawing({ type: 'anchoredText', anchors: [{ time: 0.5, price: 0.25 }], style: { text: 'Plan' } })!;
    const plot = chart.getPlotRect();
    const before = chart.getDrawingRect(id)!;
    expect(before.x).toBeCloseTo(plot.x + plot.width / 2);
    expect(before.y).toBeCloseTo(plot.y + plot.height / 4);
    chart.goToTime(bars[20].time);
    expect(chart.getDrawingRect(id)).toEqual(before);
  });
});
