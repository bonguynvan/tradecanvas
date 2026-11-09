// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const HOUR = 3_600_000;
const T0 = Date.UTC(2025, 0, 1);
const hourly = (n: number): OHLCBar[] =>
  Array.from({ length: n }, (_, i) => ({ time: T0 + i * HOUR, open: 100, high: 102, low: 98, close: 100 + (i % 5), volume: 1 }));

let host: HTMLDivElement;
let chart: Chart;

beforeEach(() => {
  installChartStubs();
  host = sizedHost();
  chart = new Chart(host, { chartType: 'candlestick' });
  chart.setData(hourly(200));
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Chart.getDrawingRect', () => {
  it('gives the box a drawing covers on screen, inside the plot', () => {
    const id = chart.addDrawing({ type: 'trendLine', anchors: [{ time: T0 + 150 * HOUR, price: 99 }, { time: T0 + 180 * HOUR, price: 103 }] })!;
    const rect = chart.getDrawingRect(id)!;
    const plot = chart.getPlotRect();
    expect(rect.width).toBeGreaterThan(0);
    expect(rect.height).toBeGreaterThan(0);
    expect(rect.x).toBeGreaterThanOrEqual(plot.x);
    expect(rect.x + rect.width).toBeLessThanOrEqual(plot.x + plot.width + 0.5);
    // The higher anchor sits nearer the top.
    const right = chart.addDrawing({ type: 'trendLine', anchors: [{ time: T0 + 150 * HOUR, price: 103 }, { time: T0 + 151 * HOUR, price: 103 }] })!;
    expect(chart.getDrawingRect(right)!.y).toBeLessThanOrEqual(rect.y + 0.5);
  });

  it('is null for a drawing that is hidden, unknown, or all off screen', () => {
    const id = chart.addDrawing({ type: 'trendLine', anchors: [{ time: T0 + 150 * HOUR, price: 99 }, { time: T0 + 180 * HOUR, price: 103 }] })!;
    expect(chart.getDrawingRect('nope')).toBeNull();
    chart.setDrawingVisible(id, false);
    expect(chart.getDrawingRect(id)).toBeNull();
    const gone = chart.addDrawing({ type: 'trendLine', anchors: [{ time: T0 - 900 * HOUR, price: 99 }, { time: T0 - 800 * HOUR, price: 103 }] })!;
    expect(chart.getDrawingRect(gone)).toBeNull();
  });
});

describe('Chart.getDrawingRect, once drawn', () => {
  it('takes in a selected drawing’s tag above its points, so a toolbar over it keeps clear', async () => {
    const id = chart.addDrawing({ type: 'priceRange', anchors: [{ time: T0 + 150 * HOUR, price: 99 }, { time: T0 + 180 * HOUR, price: 101 }] })!;
    const anchorsOnly = chart.getDrawingRect(id)!;
    chart.selectDrawing(id);
    await new Promise((r) => setTimeout(r, 60));
    const drawn = chart.getDrawingRect(id)!;
    // The change's tag sits over the box, a rise: the box reaches above the top point.
    expect(drawn.y).toBeLessThan(anchorsOnly.y - 6);
  });
});

describe('Chart.getDrawingRect, all off screen once drawn', () => {
  it('is still null when the drawing’s tag is kept on the plot', async () => {
    const id = chart.addDrawing({ type: 'priceRange', anchors: [{ time: T0 - 900 * HOUR, price: 99 }, { time: T0 - 800 * HOUR, price: 101 }] })!;
    chart.selectDrawing(id);
    await new Promise((r) => setTimeout(r, 60));
    expect(chart.getDrawingRect(id)).toBeNull();
  });
});
